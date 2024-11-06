<script lang="ts">
    let time = $state(
        new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
        }),
    );

    function updateTime() {
        time = new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
        });
    }

    $effect(() => {
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    });
</script>

<div class="taskbar">
    <div class="start">
        <button class="start-button">
            <svg
                width="16"
                height="16"
                viewBox="0 0 402 398"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M401.11 199C401.11 89.0953 311.319 -4.80409e-06 200.555 0C89.7916 4.80409e-06 -4.84164e-06 89.0953 0 199C4.84164e-06 308.904 89.7916 398 200.555 398C311.319 398 401.11 308.904 401.11 199ZM229.18 347.935C229.18 361.435 218.013 372.408 202.163 372.723C201.724 372.728 201.285 372.729 200.844 372.731H200.266C103.701 372.576 25.4673 294.853 25.4673 199C25.4673 103.052 103.857 25.2701 200.555 25.2701C201.076 25.2701 201.598 25.2724 202.117 25.2769C220.004 25.593 229.18 36.5659 229.18 50.0654C229.18 63.8043 216.94 73.9144 203.973 73.9144C191.004 73.9144 190.368 73.9144 177.956 74.9013C165.542 75.8883 152.706 85.9983 152.706 99.6967C152.706 113.476 163.989 124.573 177.956 124.573H288.041C301.968 124.573 313.248 135.67 313.248 149.369C313.248 163.067 301.968 174.163 288.041 174.163H118.48C104.513 174.163 93.2319 185.302 93.2319 199.041C93.2319 212.739 104.513 223.837 118.48 223.837H203.973C217.899 223.837 229.18 234.933 229.18 248.672C229.18 262.37 217.899 273.468 203.973 273.468H177.956C163.989 273.468 152.706 284.564 152.706 298.263C152.706 312.002 164.269 322.031 177.956 323.059C179.034 323.14 180.021 323.214 180.93 323.283C185.746 323.646 188.378 323.846 191.013 323.955C194.187 324.086 197.367 324.086 204.375 324.086C218.302 324.086 229.18 334.236 229.18 347.935Z"
                    fill="#7132F5"
                />
            </svg>
            Start
        </button>
    </div>
    <!--
    <div class="tasks">
        <button class="task active">INK</button>
    </div>
    -->
    <div class="tray">
        <span class="time">{time}</span>
    </div>
</div>

<style>
    .taskbar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 28px;
        background: #fff;
        border-top: 1px solid #ffffff;
        display: flex;
        padding: 2px;
        z-index: 1000;
    }

    .start {
        margin-right: 4px;
    }

    .start-button {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 2px 4px;
        height: 26px;
        background: #fff;
        border: 1px solid #ffffff;
        border-right-color: #808080;
        border-bottom-color: #808080;
        font-weight: bold;
    }

    /*


    .tasks {
        flex: 1;
        display: flex;
        gap: 2px;
    }

    .task {
        padding: 2px 8px;
        background: #fff;
        border: 1px solid #ffffff;
        border-right-color: #808080;
        border-bottom-color: #808080;
        min-width: 120px;
        text-align: left;
    }

    .task.active {
        background: #808080;
        border: 1px solid #808080;
        color: white;
    }

    */

    .tray {
        border-left: 1px solid #808080;
        padding: 2px 4px;
        display: flex;
        align-items: center;
        margin-left: auto;
    }

    .time {
        background: #fff;
        padding: 1px 4px;
        font-size: 11px;
        font-family: 'Pixelify Sans', 'Segoe UI', Tahoma, sans-serif;
    }

    button {
        cursor: pointer;
    }
</style>
