<script lang="ts">
    import Canvas from "$lib/components/Canvas.svelte";
    import Toolbar from "$lib/components/Toolbar.svelte";
    import ColorPalette from "$lib/components/ColorPalette.svelte";
    import Window from "$lib/components/window.svelte";
    import { currentColor, currentTool} from "$lib/store";
    import Modal from "$lib/components/Modal.svelte";
    
    let modalOpen = $state(false);
    let modalText = $state("");

    let selectedColor = $state("#000000");
    let selectedTool = $state("pencil");
    let windowSize = $state({ width: 1235, height: 485 });
    let canvasHandleUndo = $state(() => {});
    let canvasHandleRedo = $state(() => {});
    let currentImage = $state('')

    function undo() {
        canvasHandleUndo();
    }

    function redo() {
        canvasHandleRedo();
    }

    $effect(() => {
        currentColor.set(selectedColor);
        currentTool.set(selectedTool);
    });

    async function submitToDiscord() {
        if (!currentImage) return;
        
        try {
            const formData = new FormData();
            formData.append('image', currentImage);
            
            const response = await fetch('?/discord', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to submit image');
            }

        } catch (error) {
            console.error('Error submitting to Discord:', error);
        }
    }

    $effect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                submitToDiscord();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });

</script>

<main class="desktop win-cursor-default">
    <Window title="INK" undo={undo} redo={redo} discord={() => modalOpen = true} width={windowSize.width} height={windowSize.height}>
        <div class="content">
            <Toolbar bind:selectedTool />
            <div class="canvas-container">
                <Canvas bind:handleUndo={canvasHandleUndo} bind:handleRedo={canvasHandleRedo} bind:currentImage />
                <ColorPalette bind:selectedColor />
            </div>
        </div>
    </Window>
</main>

{#if modalOpen}
    <Modal
        onClose={() => modalOpen = !modalOpen}
        imageUrl={currentImage}
        text={modalText}
        onSubmit={submitToDiscord}
    />
{/if}

<style>
    .desktop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
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
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
    }
</style>
