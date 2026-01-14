import '@src/Panel.css';
import { useEffect, useState, useCallback } from 'react';
import { cn, ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { Tree, SimpleNode } from './components/Tree/Tree';
import { RightPanel } from './components/RightPanel/RightPanel';

const Panel = () => {
  const [connection, setConnection] = useState<chrome.runtime.Port | null>(null);
  const [tree, setTree] = useState<SimpleNode | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<SimpleNode[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [inspectMode, setInspectMode] = useState(false);
  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null);

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Create a connection to the background page
    const port = chrome.runtime.connect({ name: 'devtools-panel' });

    // Initialize the connection by sending the tab ID
    port.postMessage({
      name: 'init',
      tabId: chrome.devtools.inspectedWindow.tabId,
    });

    // Listen for messages from the background page
    port.onMessage.addListener((msg) => {
      console.log('Received message from background:', msg);
      if (msg.type === 'element-selected') {
        const node = msg.payload;
        // Add to selected nodes if not already present
        setSelectedNodes(prev => {
          if (prev.find(n => n.id === node.id)) return prev;
          return [...prev, node];
        });
        setSelectedTreeId(node.id);

        // Auto-expand path to selected node
        if (tree) {
          const path = findPathToNode(tree, node.id);
          if (path) {
            setExpandedIds(prev => {
              const next = new Set(prev);
              path.forEach(id => next.add(id));
              return next;
            });
          }
        }
      } else if (msg.type === 'refresh-tree') {
        refreshTree();
      }
    });

    setConnection(port);

    return () => {
      port.disconnect();
    };
  }, [tree]); // Add tree dependency to allow path calculation

  // Helper to find path to node
  const findPathToNode = (root: SimpleNode, targetId: number): number[] | null => {
    if (root.id === targetId) return [root.id];
    if (root.children) {
      for (const child of root.children) {
        const path = findPathToNode(child, targetId);
        if (path) {
          return [root.id, ...path];
        }
      }
    }
    return null;
  };

  const refreshTree = useCallback(() => {
    if (chrome.tabs && chrome.devtools.inspectedWindow.tabId) {
      chrome.tabs.sendMessage(chrome.devtools.inspectedWindow.tabId, { type: 'get-tree' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Error getting tree:', chrome.runtime.lastError);
          return;
        }
        if (response) {
          setTree(response);
          // Expand root by default
          setExpandedIds(new Set([response.id]));
        }
      });
    }
  }, []);

  // Initial tree load
  useEffect(() => {
    refreshTree();
  }, [refreshTree]);

  const toggleInspect = () => {
    const newState = !inspectMode;
    setInspectMode(newState);
    if (chrome.tabs && chrome.devtools.inspectedWindow.tabId) {
      chrome.tabs.sendMessage(chrome.devtools.inspectedWindow.tabId, { type: 'toggle-inspect', enabled: newState });
    }
  };

  const handleNodeSelect = (node: SimpleNode) => {
    setSelectedTreeId(node.id);
    // Highlight in page
    if (chrome.tabs && chrome.devtools.inspectedWindow.tabId) {
      chrome.tabs.sendMessage(chrome.devtools.inspectedWindow.tabId, { type: 'highlight-node', nodeId: node.id });
    }
  };

  const handleToggleExpand = (nodeId: number, expanded: boolean) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (expanded) {
        next.add(nodeId);
      } else {
        next.delete(nodeId);
      }
      return next;
    });
  };

  const handleNodeHover = (node: SimpleNode | null) => {
    if (chrome.tabs && chrome.devtools.inspectedWindow.tabId) {
      if (node) {
        chrome.tabs.sendMessage(chrome.devtools.inspectedWindow.tabId, { type: 'highlight-node', nodeId: node.id });
      } else {
        chrome.tabs.sendMessage(chrome.devtools.inspectedWindow.tabId, { type: 'clear-highlight' });
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, node: SimpleNode) => {
    e.preventDefault();
    // Simple context menu logic: toggle selection
    const isSelected = selectedNodes.some(n => n.id === node.id);
    if (isSelected) {
      setSelectedNodes(prev => prev.filter(n => n.id !== node.id));
    } else {
      setSelectedNodes(prev => [...prev, node]);
    }
  };

  const handleRemoveNode = (nodeId: number) => {
    setSelectedNodes(prev => prev.filter(n => n.id !== nodeId));
  };

  const handleSendMessage = (message: string) => {
    setHistory(prev => [...prev, `You: ${message}`]);
    // Simulate response or action
    setTimeout(() => {
      setHistory(prev => [...prev, `System: Received "${message}"`]);
    }, 500);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Left Panel: Tree View & Inspection */}
      <div className="flex w-1/2 flex-col border-r border-gray-300 dark:border-gray-700">
        <div className="flex items-center border-b border-gray-300 bg-gray-200 p-2 dark:border-gray-700 dark:bg-gray-800">
          <button
            className={cn(
              "mr-2 rounded p-1 hover:bg-gray-300 dark:hover:bg-gray-700",
              inspectMode && "bg-blue-300 dark:bg-blue-700"
            )}
            onClick={toggleInspect}
            title="Select an element in the page to inspect it"
          >
            {/* Arrow Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
              <path d="M13 13l6 6"></path>
            </svg>
          </button>
          <span className="font-semibold">Elements</span>
          <button onClick={refreshTree} className="ml-auto rounded p-1 hover:bg-gray-300 dark:hover:bg-gray-700" title="Refresh Tree">
            ↻
          </button>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {tree ? (
            <Tree
              node={tree}
              selectedId={selectedTreeId}
              expandedIds={expandedIds}
              onSelect={handleNodeSelect}
              onHover={handleNodeHover}
              onContextMenu={handleContextMenu}
              onToggleExpand={handleToggleExpand}
            />
          ) : (
            <div className="p-4 text-center text-gray-500">Loading DOM Tree...</div>
          )}
        </div>
      </div>

      {/* Right Panel: History & Selection */}
      <div className="flex w-1/2 flex-col">
        <RightPanel
          history={history}
          selectedNodes={selectedNodes}
          onRemoveNode={handleRemoveNode}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Panel, <LoadingSpinner />), ErrorDisplay);
