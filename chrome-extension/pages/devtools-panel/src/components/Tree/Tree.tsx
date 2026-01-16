import { useState, MouseEvent, useEffect, useRef } from 'react';
import { cn } from '@extension/ui';

export interface SimpleNode {
    id: number;
    tagName: string;
    className: string;
    children: SimpleNode[];
    text?: string;
    devTunnelSource?: string;
}

interface TreeProps {
    node: SimpleNode;
    selectedId: number | null;
    expandedIds: Set<number>;
    onSelect: (node: SimpleNode) => void;
    onHover: (node: SimpleNode | null) => void;
    onContextMenu: (event: MouseEvent, node: SimpleNode) => void;
    onToggleExpand: (nodeId: number, expanded: boolean) => void;
    depth?: number;
}

export const Tree = ({
    node,
    selectedId,
    expandedIds,
    onSelect,
    onHover,
    onContextMenu,
    onToggleExpand,
    depth = 0
}: TreeProps) => {
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selectedId === node.id && elementRef.current) {
            elementRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [selectedId, node.id]);

    const handleToggle = (e: MouseEvent) => {
        e.stopPropagation();
        onToggleExpand(node.id, !isExpanded);
    };

    const handleClick = (e: MouseEvent) => {
        e.stopPropagation();
        onSelect(node);
    };

    const handleMouseEnter = (e: MouseEvent) => {
        e.stopPropagation();
        onHover(node);
    };

    const handleMouseLeave = (e: MouseEvent) => {
        e.stopPropagation();
        onHover(null);
    };

    return (
        <div className="font-mono text-sm">
            <div
                ref={elementRef}
                className={cn(
                    "flex cursor-pointer items-center whitespace-nowrap px-1 py-0.5 hover:bg-blue-100 dark:hover:bg-blue-900",
                    selectedId === node.id && "bg-blue-200 dark:bg-blue-800"
                )}
                style={{ paddingLeft: `${depth * 12}px` }}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onContextMenu={(e) => onContextMenu(e, node)}
            >
                {hasChildren ? (
                    <span
                        onClick={handleToggle}
                        className="mr-1 inline-block w-4 text-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        {isExpanded ? '▼' : '▶'}
                    </span>
                ) : (
                    <span className="mr-1 inline-block w-4"></span>
                )}

                <span className="text-purple-600 dark:text-purple-400">
                    &lt;{node.tagName}
                </span>

                {node.className && (
                    <span className="ml-1 text-blue-600 dark:text-blue-400">
                        class="{node.className.length > 20 ? node.className.substring(0, 20) + '...' : node.className}"
                    </span>
                )}

                <span className="text-purple-600 dark:text-purple-400">&gt;</span>

                {!isExpanded && hasChildren && <span className="text-gray-400">...&lt;/{node.tagName}&gt;</span>}

                {node.text && (
                    <span className="ml-1 text-gray-800 dark:text-gray-200">
                        {node.text.length > 30 ? node.text.substring(0, 30) + '...' : node.text}
                    </span>
                )}
            </div>

            {isExpanded && hasChildren && (
                <div>
                    {node.children.map((child) => (
                        <Tree
                            key={child.id}
                            node={child}
                            selectedId={selectedId}
                            expandedIds={expandedIds}
                            onSelect={onSelect}
                            onHover={onHover}
                            onContextMenu={onContextMenu}
                            onToggleExpand={onToggleExpand}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}

            {isExpanded && hasChildren && (
                <div
                    className="px-1 py-0.5 text-purple-600 dark:text-purple-400"
                    style={{ paddingLeft: `${depth * 12 + 20}px` }}
                >
                    &lt;/{node.tagName}&gt;
                </div>
            )}
        </div>
    );
};
