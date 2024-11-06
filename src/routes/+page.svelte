<script lang="ts">
    import Canvas from "$lib/components/Canvas.svelte";
    import Toolbar from "$lib/components/Toolbar.svelte";
    import ColorPalette from "$lib/components/ColorPalette.svelte";
    import Taskbar from "$lib/components/Taskbar.svelte";
    import Window from "$lib/components/window.svelte";
    import { currentColor, currentTool } from "$lib/store";

    let selectedColor = $state("#000000");
    let selectedTool = $state("pencil");
    let windowSize = $state({ width: 1230, height: 485 });

    let canvasSize = $derived({
        width: windowSize.width - 70,
        height: (windowSize.width - 70) / 3,
    });

    $effect(() => {
        currentColor.set(selectedColor);
        currentTool.set(selectedTool);
    });

</script>

<main class="desktop win-cursor-default">
    <Window title="INK" width={windowSize.width} height={windowSize.height}>
        <div class="content">
            <Toolbar bind:selectedTool />
            <div class="canvas-container">
                <Canvas width={canvasSize.width} height={canvasSize.height} />
                <ColorPalette bind:selectedColor />
            </div>
        </div>
    </Window>

    <Taskbar />
</main>

<style>
    .desktop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        /*background-color: #008080;
        background-image: url("../ink-bg.webp");
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat; */
        overflow: hidden;
    }

    .content {
        display: flex;
        gap: 4px;
        padding: 4px;
        background-color: #fff;
        height: calc(100% - 50px);
    }

    .canvas-container {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
    }
</style>
