document.addEventListener("DOMContentLoaded", () => {
  const decreaseButton = document.getElementById("decreaseOffset");
  const increaseButton = document.getElementById("increaseOffset");
  const resetButton = document.getElementById("resetOffset");
  const currentOffsetDisplay = document.getElementById("currentOffset");
  const statusDisplay = document.getElementById("status");

  // Get current offset from content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error("Error querying tabs:", chrome.runtime.lastError);
      return;
    }
    
    chrome.tabs.sendMessage(tabs[0].id, { action: "getOffset" }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script might not be loaded yet
        console.log("Content script not ready:", chrome.runtime.lastError.message);
        updateOffsetDisplay(0); // Show default offset
        return;
      }
      
      if (response && response.offset !== undefined) {
        updateOffsetDisplay(response.offset);
      } else {
        updateOffsetDisplay(0); // Default if no response
      }
    });
  });

  // Listen for offset updates from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "offsetUpdated") {
      updateOffsetDisplay(message.offset);
    }
  });

  function updateOffsetDisplay(offset) {
    currentOffsetDisplay.textContent = `${offset > 0 ? "+" : ""}${offset}s`;
    statusDisplay.textContent =
      offset === 0
        ? "No offset applied"
        : `Subtitles ${offset > 0 ? "delayed" : "advanced"} by ${Math.abs(
            offset
          )}s`;
  }

  function sendOffsetCommand(command) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error("Error querying tabs:", chrome.runtime.lastError);
        return;
      }
      
      chrome.tabs.sendMessage(tabs[0].id, { action: command }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script might not be loaded yet
          console.log("Content script not ready:", chrome.runtime.lastError.message);
          statusDisplay.textContent = "Please refresh the Netflix page and try again";
          return;
        }
        
        if (response && response.success) {
          updateOffsetDisplay(response.offset);
        } else if (response && response.offset !== undefined) {
          // Handle case where response doesn't have success flag
          updateOffsetDisplay(response.offset);
        }
      });
    });
  }

  decreaseButton.addEventListener("click", () => {
    sendOffsetCommand("decreaseOffset");
  });

  increaseButton.addEventListener("click", () => {
    sendOffsetCommand("increaseOffset");
  });

  resetButton.addEventListener("click", () => {
    sendOffsetCommand("resetOffset");
  });
});
