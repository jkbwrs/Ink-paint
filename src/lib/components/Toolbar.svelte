<script lang="ts">
    interface Props {
        selectedTool: string;
    }

    let { selectedTool = $bindable("") }: Props = $props();

    const tools = $state([
        { id: "freeSelect", name: "Free-form Select", icon: "✄" },
        { id: "rectSelect", name: "Select", icon: "⬚" },
        { id: "eraser", name: "Eraser", icon: "⌫" },
        { id: "fill", name: "Fill", icon: "🗈" },
        { id: "picker", name: "Pick Color", icon: "⯐" },
        { id: "magnifier", name: "Magnifier", icon: "🔍" },
        { id: "pencil", name: "Pencil", icon: "✎" },
        { id: "brush", name: "Brush", icon: "🖌" },
        { id: "airbrush", name: "Airbrush", icon: "💨" },
        { id: "text", name: "Text", icon: "A" },
        { id: "line", name: "Line", icon: "/" },
        { id: "curve", name: "Curve", icon: "~" },
        { id: "rectangle", name: "Rectangle", icon: "□" },
        { id: "polygon", name: "Polygon", icon: "⬡" },
        { id: "circle", name: "Ellipse", icon: "○" },
        { id: "roundRect", name: "Rounded Rectangle", icon: "⬭" },
    ]);

    let toolTipText = $state("");
    let toolTipVisible = $state(false);
    let toolTipPosition = $state({ x: 0, y: 0 });

    function showTooltip(event: MouseEvent, name: string) {
        toolTipText = name;
        toolTipVisible = true;
        toolTipPosition = {
            x: event.clientX + 10,
            y: event.clientY + 10,
        };
    }

    function hideTooltip() {
        toolTipVisible = false;
    }

    function selectTool(id: string) {
        selectedTool = id;
    }
</script>

<div class="toolbar">
    <div class="tools-grid">
        {#each tools as tool}
            <button
                class:selected={selectedTool === tool.id}
                onclick={() => selectTool(tool.id)}
                onmouseenter={(e) => showTooltip(e, tool.name)}
                onmouseleave={hideTooltip}
            >
                <span class="icon">{tool.icon}</span>
            </button>
        {/each}
    </div>
    {#if toolTipVisible}
        <div
            class="tooltip"
            style="left: {toolTipPosition.x}px; top: {toolTipPosition.y}px;"
        >
            {toolTipText}
        </div>
    {/if}
</div>

<style>
    .toolbar {
        display: flex;
        flex-direction: column;
        padding: 2px;
        border: 1px solid #808080;
        width: 64px;
    }

    .tools-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 2px;
    }

    button {
        width: 28px;
        height: 28px;
        background: #e5e5e5;
        border: 1px solid #ffffff;
        border-right-color: rgb(106, 90, 205);
        border-bottom-color: rgb(106, 90, 205);
        padding: 2px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
    }

    button:active {
        border: 1px solid rgb(106, 90, 205);
        border-right-color: #ffffff;
        border-bottom-color: #ffffff;
    }

    button.selected {
        background: rgb(106, 90, 205);
        border: 1px solid rgb(106, 90, 205);
        color: white;
    }

    .icon {
        font-family: "Segoe UI Symbol", "Arial Unicode MS", sans-serif;
        font-size: 16px;
        line-height: 1;
    }

    .tooltip {
        position: fixed;
        background: #ffffe1;
        border: 1px solid #000000;
        padding: 2px 4px;
        font-size: 11px;
        pointer-events: none;
        z-index: 1000;
    }
</style>
