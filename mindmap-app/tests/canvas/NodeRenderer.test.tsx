import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeRenderer } from '../../src/components/Canvas/NodeRenderer';
import type { Node } from '../../src/types';

function createMockNode(overrides: Partial<Node> = {}): Node {
  return {
    id: 'node-1',
    parentId: null,
    text: 'Test Node',
    note: '',
    labels: [],
    tags: [],
    priority: 0,
    progress: 0,
    style: {
      backgroundColor: '#f0f0f0',
      textColor: '#333333',
      borderColor: '#d9d9d9',
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 400,
      padding: 8,
    },
    isFolded: false,
    positionX: 100,
    positionY: 200,
    orderIndex: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('NodeRenderer', () => {
  it('displays node text', () => {
    const node = createMockNode({ text: 'My Task' });
    const noop = vi.fn();
    render(<NodeRenderer node={node} selected={false} onClick={noop} onDoubleClick={noop} />);
    expect(screen.getByText('My Task')).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const node = createMockNode();
    const onClick = vi.fn();
    const noop = vi.fn();
    render(<NodeRenderer node={node} selected={false} onClick={onClick} onDoubleClick={noop} />);
    fireEvent.click(screen.getByText('Test Node'));
    expect(onClick).toHaveBeenCalledWith('node-1');
  });

  it('applies selected box-shadow when selected', () => {
    const node = createMockNode();
    const noop = vi.fn();
    const { container } = render(<NodeRenderer node={node} selected={true} onClick={noop} onDoubleClick={noop} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.boxShadow).toBe('0 0 0 2px #1890ff');
  });

  it('applies default box-shadow when not selected', () => {
    const node = createMockNode();
    const noop = vi.fn();
    const { container } = render(<NodeRenderer node={node} selected={false} onClick={noop} onDoubleClick={noop} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.boxShadow).toBe('0 1px 3px rgba(0,0,0,0.1)');
  });

  it('shows priority indicator when priority > 0', () => {
    const node = createMockNode({ priority: 3 });
    const noop = vi.fn();
    render(<NodeRenderer node={node} selected={false} onClick={noop} onDoubleClick={noop} />);
    expect(screen.getByText('P3')).toBeTruthy();
  });

  it('hides priority indicator when priority is 0', () => {
    const node = createMockNode({ priority: 0 });
    const noop = vi.fn();
    const { container } = render(<NodeRenderer node={node} selected={false} onClick={noop} onDoubleClick={noop} />);
    expect(container.textContent).not.toContain('P0');
  });

  it('shows progress bar when progress > 0', () => {
    const node = createMockNode({ progress: 0.5 });
    const noop = vi.fn();
    render(<NodeRenderer node={node} selected={false} onClick={noop} onDoubleClick={noop} />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('hides progress bar when progress is 0', () => {
    const node = createMockNode({ progress: 0 });
    const noop = vi.fn();
    const { container } = render(<NodeRenderer node={node} selected={false} onClick={noop} onDoubleClick={noop} />);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('sets data-node-id attribute', () => {
    const node = createMockNode({ id: 'abc-123' });
    const noop = vi.fn();
    const { container } = render(<NodeRenderer node={node} selected={false} onClick={noop} onDoubleClick={noop} />);
    const div = container.firstChild as HTMLElement;
    expect(div.getAttribute('data-node-id')).toBe('abc-123');
  });

  it('positions node using positionX and positionY', () => {
    const node = createMockNode({ positionX: 150, positionY: 300 });
    const noop = vi.fn();
    const { container } = render(<NodeRenderer node={node} selected={false} onClick={noop} onDoubleClick={noop} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.left).toBe('150px');
    expect(div.style.top).toBe('300px');
  });

  it('falls back to 0 when position is null', () => {
    const node = createMockNode({ positionX: null, positionY: null });
    const noop = vi.fn();
    const { container } = render(<NodeRenderer node={node} selected={false} onClick={noop} onDoubleClick={noop} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.left).toBe('0px');
    expect(div.style.top).toBe('0px');
  });
});
