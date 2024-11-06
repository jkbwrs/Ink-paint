<script lang="ts">
    import {
        currentColor,
        backgroundColor,
        currentTool,
        selectedArea,
        undoStack,
        redoStack,
    } from "../store";

    interface CanvasProps {
        width: number;
        height: number;
    }

    let { width, height }: CanvasProps = $props();

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
    let textInput = $state<HTMLInputElement | null>(null);
    let isDraggingSelection = $state(false);
    let selectionStartPos = $state({ x: 0, y: 0 });
    let rightMouseDown = $state(false);
    let curvePoints = $state<{ x: number; y: number }[]>([]);
    let curveStep = $state(0);

    $effect(() => {
        if (canvas && ctx) {
            const tempCanvas = document.createElement("canvas");
            const tempCtx = tempCanvas.getContext("2d")!;
            tempCanvas.width = width;
            tempCanvas.height = height;
            tempCtx.drawImage(canvas, 0, 0);
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(tempCanvas, 0, 0, width, height);
        }
    });

    function getCanvasCoordinates(e: MouseEvent) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        return {
            x: ((e.clientX + scrollLeft - rect.left) * scaleX),
            y: ((e.clientY + scrollTop - rect.top) * scaleY)
        };
    }

    function initCanvas(node: HTMLCanvasElement) {
        ctx = node.getContext("2d")!;
        ctx.fillStyle = $backgroundColor;
        ctx.fillRect(0, 0, width, height);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        imageData = ctx.getImageData(0, 0, width, height);
        undoStack.update((stack) => [
            ...stack,
            ctx.getImageData(0, 0, width, height),
        ]);
    }

    function startDrawing(e: MouseEvent) {
        isDrawing = true;
        rightMouseDown = e.button === 2;
        const { x, y } = getCanvasCoordinates(e);
        [lastX, lastY] = [x, y];
        [startX, startY] = [x, y];

        if ($selectedArea && isPointInSelection(x, y)) {
            isDraggingSelection = true;
            selectionStartPos = {
                x: x - $selectedArea.x,
                y: y - $selectedArea.y,
            };
            return;
        }

        if ($selectedArea && !isDraggingSelection) {
            applySelection();
        }

        imageData = ctx.getImageData(0, 0, width, height);

        switch ($currentTool) {
            case "freeSelect":
            case "rectSelect":
                points = [{ x: startX, y: startY }];
                break;

            case "fill":
                floodFill(
                    x,
                    y,
                    rightMouseDown ? $backgroundColor : $currentColor,
                );
                saveState();
                break;

            case "picker":
                const pixel = ctx.getImageData(x, y, 1, 1).data;
                const color = `#${pixel[0].toString(16).padStart(2, "0")}${pixel[1].toString(16).padStart(2, "0")}${pixel[2].toString(16).padStart(2, "0")}`;
                if (rightMouseDown) {
                    backgroundColor.set(color);
                } else {
                    currentColor.set(color);
                }
                break;

            case "text":
                if (textInput) {
                    applyText();
                } else {
                    createTextInput(x, y);
                }
                break;

            case "magnifier":
                toggleZoom(x, y);
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

    function draw(e: MouseEvent) {
        if (!isDrawing) return;

        const { x, y } = getCanvasCoordinates(e);

        if (isDraggingSelection && $selectedArea) {
            const newX = x - selectionStartPos.x;
            const newY = y - selectionStartPos.y;

            ctx.putImageData(imageData!, 0, 0);
            if ($selectedArea.imageData) {
                ctx.putImageData($selectedArea.imageData, newX, newY);
            }

            selectedArea.set({
                ...$selectedArea,
                x: newX,
                y: newY,
            });

            return;
        }

        switch ($currentTool) {
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

            case "freeSelect":
                points = [...points, { x, y }];
                ctx.putImageData(imageData!, 0, 0);
                ctx.beginPath();
                ctx.strokeStyle = "#000000";
                ctx.setLineDash([5, 5]);
                ctx.moveTo(points[0].x, points[0].y);
                for (const point of points) {
                    ctx.lineTo(point.x, point.y);
                }
                ctx.stroke();
                ctx.setLineDash([]);
                break;

            case "rectSelect":
                ctx.putImageData(imageData!, 0, 0);
                ctx.strokeStyle = "#000000";
                ctx.setLineDash([5, 5]);
                const width = x - startX;
                const height = y - startY;
                ctx.strokeRect(startX, startY, width, height);
                ctx.setLineDash([]);
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

    function stopDrawing() {
        if (!isDrawing) return;
        isDrawing = false;
        isDraggingSelection = false;

        switch ($currentTool) {
            case "freeSelect":
            case "rectSelect":
                const x = Math.min(startX, lastX);
                const y = Math.min(startY, lastY);
                const w = Math.abs(lastX - startX);
                const h = Math.abs(lastY - startY);

                if (w > 0 && h > 0) {
                    const selectionData = ctx.getImageData(x, y, w, h);
                    selectedArea.set({
                        x,
                        y,
                        width: w,
                        height: h,
                        imageData: selectionData,
                    });

                    ctx.fillStyle = $backgroundColor;
                    ctx.fillRect(x, y, w, h);
                }
                break;

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

    function saveState() {
        undoStack.update((stack: ImageData[]) => [
            ...stack,
            ctx.getImageData(0, 0, width, height),
        ]);
        redoStack.set([]);
    }

    function isPointInSelection(x: number, y: number): boolean {
        if (!$selectedArea) return false;
        return (
            x >= $selectedArea.x &&
            x <= $selectedArea.x + $selectedArea.width &&y >= $selectedArea.y &&
            y <= $selectedArea.y + $selectedArea.height
        );
    }

    function applySelection() {
        if ($selectedArea && $selectedArea.imageData) {
            ctx.putImageData(
                $selectedArea.imageData,
                $selectedArea.x,
                $selectedArea.y,
            );
            saveState();
        }
        selectedArea.set(null);
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

    function createTextInput(x: number, y: number) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;
        const screenX = (x / scaleX) + rect.left;
        const screenY = (y / scaleY) + rect.top;

        textInput = document.createElement("input");
        textInput.type = "text";
        textInput.style.position = "fixed";
        textInput.style.left = screenX + "px";
        textInput.style.top = screenY + "px";
        textInput.style.border = "none";
        textInput.style.outline = "none";
        textInput.style.background = "transparent";
        textInput.style.color = rightMouseDown
            ? $backgroundColor
            : $currentColor;
        textInput.style.font = '12px "MS Sans Serif"';
        document.body.appendChild(textInput);
        textInput.focus();
    }

    function applyText() {
        if (textInput && textInput.value) {
            const rect = textInput.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            const scaleX = width / canvasRect.width;
            const scaleY = height / canvasRect.height;
            const x = (rect.left - canvasRect.left) * scaleX;
            const y = (rect.top - canvasRect.top) * scaleY;

            ctx.font = '12px "MS Sans Serif"';
            ctx.fillStyle = rightMouseDown ? $backgroundColor : $currentColor;
            ctx.fillText(textInput.value, x, y + 12);

            textInput.remove();
            textInput = null;
            saveState();
        }
    }

    function toggleZoom(x: number, y: number) {
        if (zoom === 1) {
            zoom = 2;
            const zoomX = Math.max(
                0,
                Math.min(width - width / zoom, x - width / (zoom * 2)),
            );
            const zoomY = Math.max(
                0,
                Math.min(height - height / zoom, y - height / (zoom * 2)),
            );
            ctx.scale(zoom, zoom);
            ctx.translate(-zoomX, -zoomY);
        } else {
            zoom = 1;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext("2d")!;
            tempCtx.drawImage(canvas, 0, 0);
            ctx.drawImage(tempCanvas, 0, 0);
        }
    }

    function floodFill(startX: number, startY: number, fillColor: string) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        const startPos = (startY * width + startX) * 4;
        const startR = pixels[startPos];
        const startG = pixels[startPos + 1];
        const startB = pixels[startPos + 2];

        const fillR = parseInt(fillColor.slice(1, 3), 16);
        const fillG = parseInt(fillColor.slice(3, 5), 16);
        const fillB = parseInt(fillColor.slice(5, 7), 16);

        if (startR === fillR && startG === fillG && startB === fillB) {
            return;
        }

        const stack = [[startX, startY]];

        while (stack.length > 0) {
            const [x, y] = stack.pop()!;
            const pos = (y * width + x) * 4;

            if (
                x < 0 ||
                x >= width ||
                y < 0 ||
                y >= height ||
                pixels[pos] !== startR ||
                pixels[pos + 1] !== startG ||
                pixels[pos + 2] !== startB
            ) {
                continue;
            }

            pixels[pos] = fillR;
            pixels[pos + 1] = fillG;
            pixels[pos + 2] = fillB;
            pixels[pos + 3] = 255;

            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        ctx.putImageData(imageData, 0, 0);
    }

    function handleContextMenu(e: MouseEvent) {
        e.preventDefault();
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
    }

    function redo() {
        const stack = $redoStack;
        if (stack.length === 0) return;
        
        const nextState = stack[stack.length - 1];
        redoStack.update(s => s.slice(0, -1));
        undoStack.update(s => [...s, nextState]);
        
        ctx.putImageData(nextState, 0, 0);
        imageData = ctx.getImageData(0, 0, width, height);
    }
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
        background: white;
        border: 1px solid #808080;
        width: 100%;
        height: 100%;
    }
</style>