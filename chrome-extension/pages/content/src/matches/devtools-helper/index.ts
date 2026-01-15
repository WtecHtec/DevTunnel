console.log('[CEB] DevTools Helper content script loaded');

let inspectMode = false;
let highlightedElement: HTMLElement | null = null;
let overlay: HTMLElement | null = null;

// Unique ID generator for nodes
let nodeIdCounter = 0;
const nodeMap = new Map<number, HTMLElement>();

interface SimpleNode {
    id: number;
    tagName: string;
    className: string;
    children: SimpleNode[];
    text?: string;
}

function getDOMTree(element: HTMLElement): SimpleNode {
    nodeIdCounter++;
    const id = nodeIdCounter;
    nodeMap.set(id, element);
    (element as any).__devtoolsId = id; // Store ID on element for reverse lookup

    let className = '';
    if (typeof element.className === 'string') {
        className = element.className;
    } else if (element.hasAttribute('class')) {
        className = element.getAttribute('class') || '';
    }

    const node: SimpleNode = {
        id,
        tagName: element.tagName.toLowerCase(),
        className: className,
        children: [],
    };

    // Add text content if it's a leaf node or has significant text
    if (element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE) {
        const text = element.textContent?.trim();
        if (text) node.text = text;
    }

    for (let i = 0; i < element.children.length; i++) {
        const child = element.children[i] as HTMLElement;
        const tagName = child.tagName.toLowerCase();
        if (tagName === 'style' || tagName === 'script') {
            continue;
        }
        node.children.push(getDOMTree(child));
    }

    return node;
}

function createOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.pointerEvents = 'none';
    overlay.style.backgroundColor = 'rgba(137, 196, 244, 0.5)'; // Light blue semi-transparent
    overlay.style.border = '1px solid #2196f3';
    overlay.style.zIndex = '999999';
    overlay.style.transition = 'all 0.1s ease';
    document.body.appendChild(overlay);
}

function removeOverlay() {
    if (overlay) {
        overlay.remove();
        overlay = null;
    }
}

function updateOverlay(element: HTMLElement) {
    if (!overlay) createOverlay();
    if (!overlay) return;

    const rect = element.getBoundingClientRect();
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
}

function handleMouseMove(event: MouseEvent) {
    if (!inspectMode) return;

    const target = event.target as HTMLElement;
    if (target === overlay || target === document.body || target === document.documentElement) return;

    if (highlightedElement !== target) {
        highlightedElement = target;
        updateOverlay(target);
    }
}

function handleClick(event: MouseEvent) {
    if (!inspectMode) return;
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;
    if (target) {
        // Send selected element to DevTools
        // We need to find the ID we assigned earlier, or regenerate if needed
        // For now, let's assume we just send the basic info and maybe re-request tree or path
        // A better approach for "Inspect" is to send the path or ID if we have the map.

        // If we don't have an ID (e.g. dynamic element), we might need to refresh the tree
        let id = (target as any).__devtoolsId;
        if (!id) {
            // Fallback: regenerate tree to ensure IDs are consistent? 
            // Or just send tag/class for now.
            // Let's trigger a tree refresh and then select.
            chrome.runtime.sendMessage({ type: 'refresh-tree' });
        }

        chrome.runtime.sendMessage({
            type: 'element-selected',
            payload: {
                id: id,
                tagName: target.tagName.toLowerCase(),
                className: typeof target.className === 'string' ? target.className : (target.getAttribute('class') || ''),
                text: target.textContent?.substring(0, 50)
            }
        });

        toggleInspectMode(false);
    }
}

function toggleInspectMode(enabled: boolean) {
    inspectMode = enabled;
    if (inspectMode) {
        document.addEventListener('mousemove', handleMouseMove, true);
        document.addEventListener('click', handleClick, true);
        createOverlay();
        document.body.style.cursor = 'default'; // Or crosshair
    } else {
        document.removeEventListener('mousemove', handleMouseMove, true);
        document.removeEventListener('click', handleClick, true);
        removeOverlay();
        highlightedElement = null;
        document.body.style.cursor = '';
    }
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'get-tree') {
        nodeIdCounter = 0;
        nodeMap.clear();
        const tree = getDOMTree(document.body);
        sendResponse(tree);
    } else if (message.type === 'toggle-inspect') {
        toggleInspectMode(message.enabled);
    } else if (message.type === 'highlight-node') {
        const nodeId = message.nodeId;
        const element = nodeMap.get(nodeId);
        if (element) {
            updateOverlay(element);
            // Scroll into view if needed
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Remove overlay after a delay or keep it? 
            // Usually devtools keeps it while hovered in tree.
            // For now let's just show it.
        }
    } else if (message.type === 'clear-highlight') {
        removeOverlay();
    }
});
