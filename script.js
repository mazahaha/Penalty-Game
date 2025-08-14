document.addEventListener('DOMContentLoaded', () => {
    const ball = document.getElementById('ball');
    const goal = document.getElementById('goal');
    const targetGrid = document.getElementById('target-grid');
    const gameContainer = document.getElementById('game-container');

    if (targetGrid && ball && goal && gameContainer) {
        targetGrid.addEventListener('click', (event) => {
            const containerRect = gameContainer.getBoundingClientRect();

            // The click event's clientX/Y are relative to the viewport.
            // We need to make them relative to the game container.
            let targetX = event.clientX - containerRect.left;
            let targetY = event.clientY - containerRect.top;

            // Adjust so the ball's center goes to the cursor position
            targetX -= ball.offsetWidth / 2;
            targetY -= ball.offsetHeight / 2;

            // Apply the new position to the ball.
            // The 'transition' in the CSS will make it animate smoothly.
            ball.style.left = `${targetX}px`;
            ball.style.top = `${targetY}px`;
            ball.style.bottom = 'auto'; // Override 'bottom' from the stylesheet
            ball.style.transform = 'none'; // Override 'transform' from the stylesheet

            // Reset the ball's position after a couple of seconds
            setTimeout(() => {
                // Temporarily disable the transition for an instant reset
                ball.style.transition = 'none';

                // Restore the original CSS properties by removing the inline styles set by JavaScript.
                // This will make the styles from the external stylesheet apply again.
                ball.style.removeProperty('left');
                ball.style.removeProperty('top');
                ball.style.removeProperty('bottom');
                ball.style.removeProperty('transform');

                // Force the browser to apply the styles of the reset immediately
                void ball.offsetWidth;

                // Re-enable the transition for the next shot by removing the inline 'transition' style.
                ball.style.removeProperty('transition');

            }, 2000);
        });
    } else {
        console.error("One or more game elements are missing from the DOM.");
    }
});
