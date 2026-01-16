import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { SimpleNode } from '../Tree/Tree';

interface RightPanelProps {
    history: string[];
    selectedNodes: SimpleNode[];
    onRemoveNode: (nodeId: number) => void;
    onSendMessage: (message: string, role?: 'user' | 'ai') => void;
    devTunnelUrl?: string;
}

export const RightPanel = ({ history, selectedNodes, onRemoveNode, onSendMessage, devTunnelUrl }: RightPanelProps) => {
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Find all selected nodes that have a devTunnelSource
    const validSourceNodes = selectedNodes.filter(node => node.devTunnelSource);
    // Combine them into a single string
    const sourceValues = validSourceNodes.map(node => node.devTunnelSource).join('\n');

    const handleSend = async () => {
        if (!devTunnelUrl) {
            onSendMessage('Error: Missing target URL. Please add ?devtunnel=... to the inspected page URL.', 'ai');
            return;
        }
        if (!inputValue.trim() || validSourceNodes.length === 0) return;

        const msgToSend = inputValue;
        setInputValue(''); // Clear immediately
        setLoading(true);
        setStatus('Sending...');

        const dataContent = `# 目标文件(文件路径+所在行) \n${sourceValues}\n# 执行任务\n${msgToSend}`;

        try {
            // onSendMessage just updates local history, keep using it for UI feedback
            onSendMessage(msgToSend, 'user');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000 * 2); // 2 minutes timeout

            const response = await fetch(devTunnelUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: dataContent }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                setStatus('');
                // Maybe append system message for success
                onSendMessage(`Request Successful`, 'ai');
            } else {
                setStatus(`Failed: ${response.status}`);
                onSendMessage(`Request Failed: ${response.status}`, 'ai');
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                setStatus('Timed Out');
                onSendMessage(`Request Timed Out`, 'ai');
            } else {
                setStatus(`Error: ${error.message}`);
                onSendMessage(`Error: ${error.message}`, 'ai');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [inputValue]);

    const canSend = !!(devTunnelUrl && validSourceNodes.length > 0 && inputValue.trim() && !loading);

    return (
        <div className="flex h-full flex-col">
            {/* Top: History List */}
            <div className="flex-1 overflow-auto border-b border-gray-300 p-2 dark:border-gray-700">
                <div className="mb-2 text-xs text-gray-500">
                    <div>Target URL: {devTunnelUrl || 'Not found (add ?devtunnel=... to url)'}</div>
                    <div>Source ID: {sourceValues || 'Select element with data-dev-tunnel-source'}</div>
                </div>
                <h3 className="mb-2 font-semibold text-gray-500">History</h3>
                {history.length === 0 ? (
                    <div className="text-sm text-gray-400">No history yet</div>
                ) : (
                    <ul className="space-y-1">
                        {history.map((item, index) => (
                            <li key={index} className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {item}
                            </li>
                        ))}
                        {loading && (
                            <li className="text-sm text-gray-500 animate-pulse">
                                AI: ...
                            </li>
                        )}
                    </ul>
                )}
            </div>

            {/* Bottom: Selected Tags & Input */}
            <div className="flex flex-col bg-white dark:bg-gray-800">
                <div
                    className="overflow-auto p-2 transition-all duration-200"
                    style={{
                        maxHeight: '300px',
                        minHeight: selectedNodes.length > 0 ? 'auto' : '0px'
                    }}
                >
                    {selectedNodes.length > 0 && <h3 className="mb-2 font-semibold text-gray-500">Selected Elements</h3>}
                    <div className="flex flex-wrap gap-2">
                        {selectedNodes.map(node => (
                            <span
                                key={node.id}
                                className={`flex items-center rounded px-2 py-1 text-xs ${node.devTunnelSource ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}
                                title={`<${node.tagName} class="${node.className}">`}
                            >
                                {node.tagName}
                                {node.className ? `.${node.className?.split(' ')[0]}` : ''}
                                {node.devTunnelSource ? ' [Source]' : ''}
                                <button
                                    className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                                    onClick={() => onRemoveNode(node.id)}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex border-t border-gray-300 p-2 dark:border-gray-700">
                    <textarea
                        ref={textareaRef}
                        className="mr-2 flex-1 resize-none rounded border border-gray-300 bg-transparent px-2 py-1 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600"
                        placeholder="Type a message..."
                        rows={1}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{ maxHeight: '120px' }}
                        disabled={loading}
                    />
                    <button
                        className={`h-fit rounded px-4 py-1 text-sm font-semibold text-white ${canSend ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
                        onClick={handleSend}
                        disabled={!canSend}
                    >
                        {loading ? 'Sending...' : 'Send'}
                    </button>
                </div>
                {status && <div className="px-2 pb-1 text-xs text-gray-500">{status}</div>}
            </div>
        </div>
    );
};
