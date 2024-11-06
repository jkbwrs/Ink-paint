<script lang="ts">
    import type { Snippet } from "svelte";
    import FileMenu from "./FileMenu.svelte";

    interface WindowProps {
        title: string;
        width: number;
        height: number;
        children: Snippet
    }

    let { title, width, height, children }: WindowProps = $props();

    let windowPosition = $state({
        x: 0,
        y: 0
    });

    let dragStart = $state({ x: 0, y: 0 });
    let isDragging = $state(false);
    let fileMenuOpen = $state(false);

    $effect(() => {
        windowPosition = {
            x: Math.max(0, (window.innerWidth - width) / 2),
            y: Math.max(0, (window.innerHeight - height) / 2)
        };
    });

    function handleMouseDown(e: MouseEvent) {
        const target = e.target as Element;
        if (target.closest(".title-bar")) {
            isDragging = true;
            dragStart = {
                x: e.clientX - windowPosition.x,
                y: e.clientY - windowPosition.y,
            };
        }
    }

    function handleMouseMove(e: MouseEvent) {
        if (isDragging) {
            const newX = Math.max(
                0,
                Math.min(
                    window.innerWidth - width,
                    e.clientX - dragStart.x,
                ),
            );
            const newY = Math.max(
                0,
                Math.min(
                    window.innerHeight - height,
                    e.clientY - dragStart.y,
                ),
            );

            windowPosition = { x: newX, y: newY };
        }
    }

    function handleMouseUp() {
        isDragging = false;
    }

    function handleFileAction(event: CustomEvent) {
        const { id } = event.detail;
        fileMenuOpen = false;
    }
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div
    class="window"
    style="left: {windowPosition.x}px; top: {windowPosition.y}px; width: {width}px; height: {height}px;"
    role="dialog"
    aria-labelledby="window"
    onmousedown={handleMouseDown}
>
    <div class="title-bar win-cursor-move">
        <span>{title}</span>
        <div class="window-controls">
            <button class="minimize win-cursor-default">_</button>
            <button class="maximize win-cursor-default">□</button>
            <button class="close win-cursor-default">×</button>
        </div>
    </div>
    <FileMenu
        isOpen={fileMenuOpen}
        on:action={handleFileAction}
    />
    <div class="content">
        {#if children}
            {@render children()}
        {/if}
    </div>
</div>

<style>
    .window {
        position: absolute;
        background-color: #c0c0c0;
        border: 2px solid #ffffff;
        border-right-color: #808080;
        border-bottom-color: #808080;
        box-shadow: 1px 1px 0 #000000;
        padding: 2px;
        user-select: none;
    }

    .title-bar {
        background-color: rgb(72, 61, 139);
        color: white;
        padding: 2px 4px;
        font-weight: bold;
        font-size: 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .window-controls {
        display: flex;
        gap: 2px;
    }

    .window-controls button {
        width: 16px;
        height: 14px;
        font-size: 10px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #c0c0c0;
        border: 1px solid #ffffff;
        border-right-color: #808080;
        border-bottom-color: #808080;
    }

    .content {
        display: flex;
        gap: 4px;
        padding: 4px;
        background-color: #c0c0c0;
        height: calc(100% - 58px);
    }
</style>
