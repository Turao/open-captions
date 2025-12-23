document.addEventListener('DOMContentLoaded', () => {
  const decreaseButton = document.getElementById('decreaseOffset') as HTMLButtonElement;
  const increaseButton = document.getElementById('increaseOffset') as HTMLButtonElement;
  const resetButton = document.getElementById('resetOffset') as HTMLButtonElement;
  const currentOffsetDisplay = document.getElementById('currentOffset') as HTMLSpanElement;
  const statusDisplay = document.getElementById('status') as HTMLDivElement;

  function updateOffsetDisplay(offset: number): void {
    currentOffsetDisplay.textContent = `${offset > 0 ? '+' : ''}${offset}s`;
    statusDisplay.textContent =
      offset === 0
        ? 'No offset applied'
        : `Subtitles ${offset > 0 ? 'delayed' : 'advanced'} by ${Math.abs(offset)}s`;
  }

  function sendOffsetCommand(command: string): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error('Error querying tabs:', chrome.runtime.lastError);
        return;
      }

      const tabId = tabs[0]?.id;
      if (tabId === undefined) return;

      chrome.tabs.sendMessage(tabId, { action: command }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script might not be loaded yet
          console.log('Content script not ready:', chrome.runtime.lastError.message);
          statusDisplay.textContent = 'Please refresh the Netflix page and try again';
          return;
        }

        if (response?.success) {
          updateOffsetDisplay(response.offset);
        } else if (response?.offset !== undefined) {
          // Handle case where response doesn't have success flag
          updateOffsetDisplay(response.offset);
        }
      });
    });
  }

  // Get current offset from content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error('Error querying tabs:', chrome.runtime.lastError);
      return;
    }

    const tabId = tabs[0]?.id;
    if (tabId === undefined) {
      updateOffsetDisplay(0);
      return;
    }

    chrome.tabs.sendMessage(tabId, { action: 'getOffset' }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script might not be loaded yet
        console.log('Content script not ready:', chrome.runtime.lastError.message);
        updateOffsetDisplay(0); // Show default offset
        return;
      }

      if (response?.offset !== undefined) {
        updateOffsetDisplay(response.offset);
      } else {
        updateOffsetDisplay(0); // Default if no response
      }
    });
  });

  // Listen for offset updates from content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'offsetUpdated') {
      updateOffsetDisplay(message.offset);
    }
  });

  decreaseButton.addEventListener('click', () => {
    sendOffsetCommand('decreaseOffset');
  });

  increaseButton.addEventListener('click', () => {
    sendOffsetCommand('increaseOffset');
  });

  resetButton.addEventListener('click', () => {
    sendOffsetCommand('resetOffset');
  });
});

