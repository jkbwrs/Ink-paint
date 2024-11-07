<script lang="ts">
    import {
        currentColor,
        backgroundColor,
        currentTool,
        undoStack,
        redoStack,
        newCanvas,
        STORAGE_KEY,
        UNDO_STACK_KEY,
        REDO_STACK_KEY,
    } from "../store";

    interface Props {
        handleUndo: () => void
        handleRedo: () => void
        currentImage: string
    }

    let {
        handleUndo = $bindable(() => {}),
        handleRedo = $bindable(() => {}),
        currentImage = $bindable('')
    }: Props = $props()

    let width = $state(1155);
    let height = $state(385);

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    let isDrawing = $state(false);
    let lastX = $state(0);
    let lastY = $state(0);
    let startX = $state(0);
    let startY = $state(0);
    let points = $state<{ x: number; y: number }[]>([]);
    let imageData = $state<ImageData | null>(null);
    let zoom = $state(1);
    let rightMouseDown = $state(false);
    let curvePoints = $state<{ x: number; y: number }[]>([]);
    let curveStep = $state(0);

    $effect(() => {
        if (canvas && ctx) {
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext("2d", {
                alpha: false,
                willReadFrequently: true
            })!;
            
            tempCtx.drawImage(canvas, 0, 0);
            canvas.width = width;
            canvas.height = height;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(tempCanvas, 0, 0, width, height);
            
            if (canvas.toDataURL() !== document.createElement('canvas').toDataURL()) {
                saveToLocalStorage();
            }

            const unsubscribe = newCanvas.subscribe(isNew => {
                if (isNew) {
                    ctx.fillStyle = $backgroundColor;
                    ctx.fillRect(0, 0, width, height);
                    localStorage.removeItem(STORAGE_KEY);
                    localStorage.removeItem(UNDO_STACK_KEY); 
                    localStorage.removeItem(REDO_STACK_KEY);
                    undoStack.set([]);
                    redoStack.set([]);
                    newCanvas.set(false);
                    imageData = ctx.getImageData(0, 0, width, height);
                }
            });

            return () => {
                unsubscribe();
            };
        }
    });

    function saveToLocalStorage() {
        if (!canvas) return;
        
        try {
            localStorage.setItem(STORAGE_KEY, canvas.toDataURL());
            
            const maxStates = 10;
            
            const undoData = $undoStack
                .slice(-maxStates)
                .map(imageData => canvas.toDataURL());
                
            const redoData = $redoStack
                .slice(-maxStates)
                .map(imageData => canvas.toDataURL());
            
            localStorage.setItem(UNDO_STACK_KEY, JSON.stringify(undoData));
            localStorage.setItem(REDO_STACK_KEY, JSON.stringify(redoData));
        } catch (error) {
            if (error instanceof Error && error.name === 'QuotaExceededError') {
                try {
                    localStorage.setItem(STORAGE_KEY, canvas.toDataURL());
                    localStorage.removeItem(UNDO_STACK_KEY);
                    localStorage.removeItem(REDO_STACK_KEY);
                } catch (e) {
                    localStorage.removeItem(STORAGE_KEY);
                    localStorage.removeItem(UNDO_STACK_KEY);
                    localStorage.removeItem(REDO_STACK_KEY);
                }
            }
        }
    }

    function restoreFromLocalStorage() {
        if (!canvas || !ctx) return;

        const savedImage = localStorage.getItem(STORAGE_KEY);
        if (savedImage) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
                imageData = ctx.getImageData(0, 0, width, height);
                
                const savedUndoStack = localStorage.getItem(UNDO_STACK_KEY);
                const savedRedoStack = localStorage.getItem(REDO_STACK_KEY);
                
                if (savedUndoStack) {
                    const undoUrls = JSON.parse(savedUndoStack);
                    Promise.all(undoUrls.map(loadImageData))
                        .then(undoStates => {
                            undoStack.set(undoStates);
                        });
                }
                
                if (savedRedoStack) {
                    const redoUrls = JSON.parse(savedRedoStack);
                    Promise.all(redoUrls.map(loadImageData))
                        .then(redoStates => {
                            redoStack.set(redoStates);
                        });
                }
            };
            img.src = savedImage;
        }
    }

    function loadImageData(dataUrl: string): Promise<ImageData> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = height;
                const tempCtx = tempCanvas.getContext('2d')!;
                tempCtx.drawImage(img, 0, 0);
                resolve(tempCtx.getImageData(0, 0, width, height));
            };
            img.src = dataUrl;
        });
    }

    function saveState() {
        undoStack.update((stack: ImageData[]) => {
            const maxStates = 10;
            const newStack = [...stack, ctx.getImageData(0, 0, width, height)];
            return newStack.slice(-maxStates); 
        });
        redoStack.set([]);
        saveToLocalStorage();
        updateCurrentImage();
    }

    function getCanvasCoordinates(e: MouseEvent) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = width / canvas.offsetWidth;
        const scaleY = height / canvas.offsetHeight;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        return {
            x: Math.round(x),
            y: Math.round(y)
        };
    }

    function initCanvas(node: HTMLCanvasElement) {
        canvas = node;
        ctx = node.getContext("2d", {
            alpha: false,
            willReadFrequently: true
        })!;
        
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = $backgroundColor;
        ctx.fillRect(0, 0, width, height);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        imageData = ctx.getImageData(0, 0, width, height);
        
        const savedImage = localStorage.getItem(STORAGE_KEY);
        
        if (savedImage) {
            restoreFromLocalStorage();
        } else if ($undoStack.length === 0) {
            undoStack.update((stack) => [
                ...stack,
                ctx.getImageData(0, 0, width, height),
            ]);
        }
        updateCurrentImage();
    }

    function startDrawing(e: MouseEvent) {
        isDrawing = true;
        rightMouseDown = e.button === 2;
        const { x, y } = getCanvasCoordinates(e);
        [lastX, lastY] = [x, y];
        [startX, startY] = [x, y];

        imageData = ctx.getImageData(0, 0, width, height);

        switch ($currentTool) {
            case "splash":
            case "pepe":
            case "dodge":
            case "dodge-2":
                loadSvg($currentTool, x, y);
                break;
                
            case "fill":
                floodFill(
                    x,
                    y,
                    rightMouseDown ? $backgroundColor : $currentColor,
                );
                saveState();
                break;

            case "curve":
                if (curveStep === 0) {
                    curvePoints = [{ x: startX, y: startY }];
                }
                break;

            case "polygon":
                if (points.length === 0) {
                    points = [{ x: startX, y: startY }];
                }
                break;
        }
    }

    function applyAscii() {
        if (!ctx || !imageData) return;
        
        const ASCII_CHARS = ' .`-_\':,;^=+/"|)\\<>)iv%xclrs{*}I?!][1taeo7zjLunT#JCwfy325Fp6mqSghVd4EgXPGZbYkOA&8U$@KHDBWNMR0Q'.split('');
        const charSize = 6;
        const fontScale = 1.2;
        
        const originalImageData = ctx.getImageData(0, 0, width, height);
        const data = originalImageData.data;
        
        const grayscaleData = new Uint8ClampedArray(data.length);
        for (let i = 0; i < data.length; i += 4) {
            const brightness = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            grayscaleData[i] = grayscaleData[i + 1] = grayscaleData[i + 2] = brightness;
            grayscaleData[i + 3] = data[i + 3]; 
        }
        
        ctx.fillStyle = $backgroundColor;
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = $currentColor;
        ctx.font = `${charSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const cols = Math.floor(width / charSize);
        const rows = Math.floor(height / (charSize * fontScale));
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                let total = 0;
                let count = 0;
                let hasContent = false;
                
                const startX = x * charSize;
                const startY = y * charSize * fontScale;
                
                for (let py = startY; py < startY + charSize * fontScale && py < height; py++) {
                    for (let px = startX; px < startX + charSize && px < width; px++) {
                        const pos = (Math.floor(py) * width + Math.floor(px)) * 4;
                        const alpha = data[pos + 3];
                        
                        if (alpha > 0) {
                            const brightness = grayscaleData[pos];
                            total += brightness;
                            count++;
                            hasContent = true;
                        }
                    }
                }
                
                if (hasContent) {
                    const avgBrightness = count > 0 ? total / count : 0;
                    const charIndex = Math.floor((avgBrightness / 255) * (ASCII_CHARS.length - 1));
                    
                    ctx.fillText(
                        ASCII_CHARS[charIndex],
                        x * charSize + charSize/2,
                        y * charSize * fontScale + (charSize * fontScale)/2
                    );
                }
            }
        }
        
        saveState();
    }

    function draw(e: MouseEvent) {
        if (!isDrawing) return;

        const { x, y } = getCanvasCoordinates(e);

        if (['splash', 'pepe', 'dodge', 'dodge-2'].includes($currentTool)) {
            const dx = x - lastX;
            const dy = y - lastY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 35) {
                loadSvg($currentTool, x, y);
                [lastX, lastY] = [x, y];
            }
            return;
        }

        switch ($currentTool) {
            case "ascii":
                applyAscii();
                break;
            case "pencil":
                ctx.beginPath();
                ctx.strokeStyle = rightMouseDown ? $backgroundColor : $currentColor;
                ctx.lineWidth = 1;
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(x, y);
                ctx.stroke();
                break;

            case "brush":
                ctx.beginPath();
                ctx.strokeStyle = rightMouseDown ? $backgroundColor : $currentColor;
                ctx.lineWidth = 5;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(x, y);
                ctx.stroke();
                break;

            case "airbrush":
                const density = 20;
                const radius = 10;
                ctx.fillStyle = rightMouseDown ? $backgroundColor : $currentColor;
                for (let i = 0; i < density; i++) {
                    const offsetX = (Math.random() - 0.5) * radius * 2;
                    const offsetY = (Math.random() - 0.5) * radius * 2;
                    if (offsetX * offsetX + offsetY * offsetY <= radius * radius) {
                        ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
                    }
                }
                break;

            case "eraser":
                ctx.beginPath();
                ctx.strokeStyle = rightMouseDown ? $currentColor : $backgroundColor;
                ctx.lineWidth = 10;
                ctx.lineCap = "square";
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(x, y);
                ctx.stroke();
                break;

            case "line":
                ctx.putImageData(imageData!, 0, 0);
                ctx.beginPath();
                ctx.strokeStyle = rightMouseDown ? $backgroundColor : $currentColor;
                ctx.lineWidth = 1;
                ctx.moveTo(startX, startY);

                if (e.shiftKey) {
                    const dx = x - startX;
                    const dy = y - startY;
                    const angle = Math.atan2(dy, dx);
                    const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const endX = startX + distance * Math.cos(snappedAngle);
                    const endY = startY + distance * Math.sin(snappedAngle);
                    ctx.lineTo(endX, endY);
                } else {
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
                break;

            case "curve":
                ctx.putImageData(imageData!, 0, 0);
                ctx.beginPath();
                ctx.strokeStyle = rightMouseDown ? $backgroundColor : $currentColor;
                ctx.lineWidth = 1;

                if (curveStep === 0) {
                    ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
                    ctx.lineTo(x, y);
                } else if (curveStep === 1) {
                    const cp1 = { x, y };
                    ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
                    ctx.quadraticCurveTo(cp1.x, cp1.y, curvePoints[1].x, curvePoints[1].y);
                }
                ctx.stroke();
                break;

            case "rectangle":
            case "roundRect":
                ctx.putImageData(imageData!, 0, 0);
                const rectWidth = x - startX;
                const rectHeight = y - startY;

                if (e.shiftKey) {
                    const size = Math.min(Math.abs(rectWidth), Math.abs(rectHeight));
                    const signX = Math.sign(rectWidth);
                    const signY = Math.sign(rectHeight);

                    if ($currentTool === "roundRect") {
                        drawRoundedRect(startX, startY, size * signX, size * signY);
                    } else {
                        ctx.strokeStyle = rightMouseDown ? $backgroundColor : $currentColor;
                        ctx.strokeRect(startX, startY, size * signX, size * signY);
                    }
                } else {
                    if ($currentTool === "roundRect") {
                        drawRoundedRect(startX, startY, rectWidth, rectHeight);
                    } else {
                        ctx.strokeStyle = rightMouseDown ? $backgroundColor : $currentColor;
                        ctx.strokeRect(startX, startY, rectWidth, rectHeight);
                    }
                }
                break;

            case "circle":
                ctx.putImageData(imageData!, 0, 0);
                ctx.beginPath();
                ctx.strokeStyle = rightMouseDown ? $backgroundColor : $currentColor;

                if (e.shiftKey) {
                    const size = Math.min(Math.abs(x - startX), Math.abs(y - startY));
                    const centerX = startX + (Math.sign(x - startX) * size) / 2;
                    const centerY = startY + (Math.sign(y - startY) * size) / 2;
                    ctx.ellipse(centerX, centerY, size / 2, size / 2, 0, 0, 2 * Math.PI);
                } else {
                    const radiusX = Math.abs(x - startX) / 2;
                    const radiusY = Math.abs(y - startY) / 2;
                    const centerX = Math.min(startX, x) + radiusX;
                    const centerY = Math.min(startY, y) + radiusY;
                    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                }
                ctx.stroke();
                break;

            case "polygon":
                ctx.putImageData(imageData!, 0, 0);
                ctx.beginPath();
                ctx.strokeStyle = rightMouseDown ? $backgroundColor : $currentColor;
                ctx.moveTo(points[0].x, points[0].y);

                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }

                ctx.lineTo(x, y);
                if (isNearStartPoint(x, y)) {
                    ctx.closePath();
                }
                ctx.stroke();
                break;
        }

        [lastX, lastY] = [x, y];
    }

    async function loadSvg(toolId: string, x: number, y: number): Promise<void> {
        if (!ctx) return;
        
        try {
            const response = await fetch(`../${toolId}.svg`);
            const svgText = await response.text();
            
            const blob = new Blob([svgText], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            
            const img = new Image();
            img.onload = () => {
                const size = 70;
                const drawX = x - size/2;
                const drawY = y - size/2;
                
                ctx.drawImage(img, drawX, drawY, size, size);
                URL.revokeObjectURL(url);
                saveState();
                updateCurrentImage();
            };
            img.src = url;
        } catch (error) {
            console.error('Failed to load SVG:', error);
        }
    }

    function stopDrawing() {
        if (!isDrawing) return;
        isDrawing = false;

        switch ($currentTool) {
            case "curve":
                if (curveStep === 0) {
                    curvePoints = [...curvePoints, { x: lastX, y: lastY }];
                    curveStep = 1;
                } else {
                    curveStep = 0;
                    saveState();
                }
                break;

            case "polygon":
                if (isNearStartPoint(lastX, lastY) && points.length > 2) {
                    ctx.beginPath();
                    ctx.strokeStyle = rightMouseDown ? $backgroundColor : $currentColor;
                    ctx.moveTo(points[0].x, points[0].y);
                    for (const point of points) {
                        ctx.lineTo(point.x, point.y);
                    }
                    ctx.closePath();
                    ctx.stroke();
                    points = [];
                    saveState();
                } else {
                    points = [...points, { x: lastX, y: lastY }];
                }
                break;

            default:
                saveState();
                break;
        }

        imageData = ctx.getImageData(0, 0, width, height);
    }

    function isNearStartPoint(x: number, y: number): boolean {
        if (points.length === 0) return false;
        const dx = x - points[0].x;
        const dy = y - points[0].y;
        return Math.sqrt(dx * dx + dy * dy) < 5;
    }

    function drawRoundedRect(
        x: number,
        y: number,
        width: number,
        height: number,
    ) {
        const radius = Math.min(10, Math.abs(width) / 4, Math.abs(height) / 4);
        ctx.beginPath();
        ctx.strokeStyle = rightMouseDown ? $backgroundColor : $currentColor;

        const right = x + width;
        const bottom = y + height;
        const signX = Math.sign(width);
        const signY = Math.sign(height);

        ctx.moveTo(x + radius * signX, y);
        ctx.lineTo(right - radius * signX, y);
        ctx.quadraticCurveTo(right, y, right, y + radius * signY);
        ctx.lineTo(right, bottom - radius * signY);
        ctx.quadraticCurveTo(right, bottom, right - radius * signX, bottom);
        ctx.lineTo(x + radius * signX, bottom);
        ctx.quadraticCurveTo(x, bottom, x, bottom - radius * signY);
        ctx.lineTo(x, y + radius * signY);
        ctx.quadraticCurveTo(x, y, x + radius * signX, y);

        ctx.stroke();
    }

    function floodFill(startX: number, startY: number, fillColor: string) {
        startX = Math.floor(startX);
        startY = Math.floor(startY);
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        const startPos = (startY * width + startX) * 4;
        const targetR = pixels[startPos];
        const targetG = pixels[startPos + 1];
        const targetB = pixels[startPos + 2];
        const targetA = pixels[startPos + 3];

        const fillR = parseInt(fillColor.slice(1, 3), 16);
        const fillG = parseInt(fillColor.slice(3, 5), 16);
        const fillB = parseInt(fillColor.slice(5, 7), 16);
        const fillA = 255;

        if (
            targetR === fillR &&
            targetG === fillG &&
            targetB === fillB &&
            targetA === fillA
        ) {
            return;
        }

        function matchesTarget(pos: number): boolean {
            return (
                pixels[pos] === targetR &&
                pixels[pos + 1] === targetG &&
                pixels[pos + 2] === targetB &&
                pixels[pos + 3] === targetA
            );
        }

        function setPixel(pos: number) {
            pixels[pos] = fillR;
            pixels[pos + 1] = fillG;
            pixels[pos + 2] = fillB;
            pixels[pos + 3] = fillA;
        }

        const queue: [number, number][] = [[startX, startY]];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const [x, y] = queue.shift()!;
            const key = `${x},${y}`;

            if (visited.has(key)) continue;
            if (x < 0 || x >= width || y < 0 || y >= height) continue;

            const pos = (y * width + x) * 4;
            
            if (!matchesTarget(pos)) continue;

            visited.add(key);
            setPixel(pos);

            queue.push(
                [x + 1, y],
                [x - 1, y],
                [x, y + 1],
                [x, y - 1]
            );
        }

        ctx.putImageData(imageData, 0, 0);
    }

    function handleContextMenu(e: MouseEvent) {
        e.preventDefault();
    }

    function updateCurrentImage() {
        if (canvas) {
            currentImage = canvas.toDataURL();
        }
    }

    $effect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'z') {
                undo();
            } else if (e.ctrlKey && e.key === 'y') {
                redo();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });

    function undo() {
        const stack = $undoStack;
        if (stack.length <= 1) return;
        
        const currentState = stack[stack.length - 1];
        const previousState = stack[stack.length - 2];
        
        undoStack.update(s => s.slice(0, -1));
        redoStack.update(s => [...s, currentState]);
        
        ctx.putImageData(previousState, 0, 0);
        imageData = ctx.getImageData(0, 0, width, height);
        saveToLocalStorage();
        updateCurrentImage();
    }

    function redo() {
        const stack = $redoStack;
        if (stack.length === 0) return;
        
        const nextState = stack[stack.length - 1];
        redoStack.update(s => s.slice(0, -1));
        undoStack.update(s => [...s, nextState]);
        
        ctx.putImageData(nextState, 0, 0);
        imageData = ctx.getImageData(0, 0, width, height);
        saveToLocalStorage();
        updateCurrentImage();
    }

    $effect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                redo();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });

    $effect(() => {
        handleUndo = undo;
        handleRedo = redo;
    });

</script>


<canvas
    bind:this={canvas}
    {width}
    {height}
    onmousedown={startDrawing}
    onmousemove={draw}
    onmouseup={stopDrawing}
    onmouseleave={stopDrawing}
    oncontextmenu={handleContextMenu}
    class="tool-{$currentTool}"
    use:initCanvas
></canvas>

<style>
    canvas {
        display: block;
        background: #7853CD;
        border: 1px solid #808080;
        image-rendering: pixelated;
        image-rendering: crisp-edges;
        -webkit-image-rendering: pixelated;
        -moz-image-rendering: crisp-edges;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
    }
</style>