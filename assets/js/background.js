chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('window.html', {
    minWidth: 640,
    minHeight: 320,
    singleton: true,
    bounds: {
      width: Math.min(900, screen.width),
      height: Math.min(600, screen.height)
    }
  });
});