<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { undoStack, redoStack } from "../store";
    import { get } from "svelte/store";

    interface Props {
        isOpen: boolean;
    }

    let { isOpen }: Props = $props();

    let undoDisabled = $derived(get(undoStack).length <= 1);
    let redoDisabled = $derived(get(redoStack).length === 0);

    const dispatch = createEventDispatcher<{
        action: { id: string };
    }>();

    function handleClick(id: string) {
        if (id === "undo" && !undoDisabled) {
            const stack = get(undoStack);
            if (stack.length <= 1) return;

            const currentState = stack[stack.length - 1];
            const previousState = stack[stack.length - 2];

            undoStack.update((s) => s.slice(0, -1));
            redoStack.update((s) => [...s, currentState]);
        } else if (id === "redo" && !redoDisabled) {
            const stack = get(redoStack);
            if (stack.length === 0) return;

            const nextState = stack[stack.length - 1];
            redoStack.update((s) => s.slice(0, -1));
            undoStack.update((s) => [...s, nextState]);
        }

        dispatch("action", { id });
        isOpen = false;
    }

    function handleMouseLeave() {
        setTimeout(() => {
            isOpen = false;
        }, 500);
    }

    function toggleMenu() {
        isOpen = !isOpen;
    }
</script>

<div class="menu-bar win-cursor-default">
    {#if isOpen}
        <div
            class="menu win-cursor-default"
            onmouseleave={handleMouseLeave}
            role="menu"
            tabindex="0"
        >
            <button
                class="menu-item win-cursor-default"
                onclick={() => handleClick("new")}
            >
                <span>New</span>
                <span class="shortcut">Ctrl+N</span>
            </button>
            <button
                class="menu-item win-cursor-default"
                onclick={() => handleClick("open")}
            >
                <span>Open...</span>
                <span class="shortcut">Ctrl+O</span>
            </button>
            <button
                class="menu-item win-cursor-default"
                onclick={() => handleClick("save")}
            >
                <span>Save</span>
                <span class="shortcut">Ctrl+S</span>
            </button>
            <button
                class="menu-item win-cursor-default"
                onclick={() => handleClick("saveAs")}
            >
                <span>Save As...</span>
            </button>
            <div class="separator"></div>
            <button
                class="menu-item win-cursor-default"
                onclick={() => handleClick("undo")}
                disabled={undoDisabled}
            >
                <span>Undo</span>
                <span class="shortcut">Ctrl+Z</span>
            </button>
            <button
                class="menu-item win-cursor-default"
                onclick={() => handleClick("redo")}
                disabled={redoDisabled}
            >
                <span>Redo</span>
                <span class="shortcut">Ctrl+Y</span>
            </button>
            <div class="separator"></div>
            <button
                class="menu-item win-cursor-default"
                onclick={() => handleClick("exit")}
            >
                <span>Exit</span>
            </button>
        </div>
    {/if}
    <span
        class="menu-item-top"
        onclick={toggleMenu}
        onkeydown={(e) => e.key === "Enter" && toggleMenu()}
        role="menuitem"
        tabindex="0">File</span
    >
    <span class="menu-item-top">Edit</span>
    <span class="menu-item-top">View</span>
    <span class="menu-item-top">Image</span>
    <span class="menu-item-top">Options</span>
    <span class="menu-item-top">Help</span>
</div>

<style>
    .menu-bar {
        background-color: #c0c0c0;
        padding: 4px;
        border-bottom: 1px solid #808080;
        display: flex;
        gap: 16px;
        position: relative;
    }

    .menu-item-top {
        cursor: pointer;
        padding: 2px 4px;
    }

    .menu-item-top:hover {
        background: #000080;
        color: white;
    }

    .menu {
        position: absolute;
        top: 100%;
        left: 4px;
        background: #c0c0c0;
        border: 1px solid #808080;
        border-top: 1px solid #ffffff;
        border-left: 1px solid #ffffff;
        padding: 2px;
        min-width: 180px;
        z-index: 1000;
    }

    .menu-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 4px 8px;
        text-align: left;
        background: transparent;
        border: none;
    }

    .menu-item:hover:not(:disabled) {
        background: #000080;
        color: white;
    }

    .menu-item:disabled {
        color: #808080;
        cursor: default;
    }

    .shortcut {
        color: #808080;
        margin-left: 20px;
    }

    .menu-item:hover:not(:disabled) .shortcut {
        color: white;
    }

    .separator {
        height: 1px;
        background: #808080;
        margin: 2px 0;
    }
</style>
