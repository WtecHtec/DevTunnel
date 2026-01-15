import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { SimpleNode } from '../Tree/Tree';

interface RightPanelProps {
    history: string[];
    selectedNodes: SimpleNode[];
    onRemoveNode: (nodeId: number) => void;
    onSendMessage: (message: string) => void;
}

export const RightPanel = ({ history, selectedNodes, onRemoveNode, onSendMessage }: RightPanelProps) => {
    const [inputValue, setInputValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (inputValue.trim()) {
            onSendMessage(inputValue);
            setInputValue('');
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

    return (
        <div className="flex h-full flex-col">
            {/* Top: History List */}
            <div className="flex-1 overflow-auto border-b border-gray-300 p-2 dark:border-gray-700">
                <h3 className="mb-2 font-semibold text-gray-500">History</h3>
                {history.length === 0 ? (
                    <div className="text-sm text-gray-400">No history yet</div>
                ) : (
                    <ul className="space-y-1">
                        {history.map((item, index) => (
                            <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                                {item}
                            </li>
                        ))}
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
                                className="flex items-center rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                title={`<${node.tagName} class="${node.className}">`}
                            >
                                {node.tagName}
                                {node.className ? `.${node.className?.split(' ')[0]}` : ''}
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
                    />
                    <button
                        className="h-fit rounded bg-blue-600 px-4 py-1 text-sm font-semibold text-white hover:bg-blue-700"
                        onClick={handleSend}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};
