function Driver(renderables) {
  var clock = new THREE.Clock();

  this.render = function() {
    var delta = clock.getDelta();
    var elapsed = clock.getElapsedTime();
    try {
      for (var i = 0; i < renderables.length; i++) {
        renderables[i].animate(delta, elapsed);
        renderables[i].render(delta, elapsed);
      }
    } catch(e) {
      throw e;
      return;  // stop animation.
    }

    requestAnimationFrame(this.render.bind(this));
  };

  function registerEventHandlers() {
    document.addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('touchstart', onDocumentTouchStart, false);
    document.addEventListener('keypress', onDocumentKeyPress, false);
    document.addEventListener('keydown', onDocumentKeyDown, false);
    window.addEventListener('resize', onWindowResize, false);
  }

  function getUnitCoord(x, y) {
    return new THREE.Vector2(
        (x / window.innerWidth) * 2 - 1,
        -(y / window.innerHeight) * 2 + 1);
  }

  function onWindowResize() {
    var size = {
	width: window.innerWidth,
 	height: window.innerHeight,
	aspectRatio: window.innerWidth / window.innerHeight
    };
    if (isIOS()) {
      // Fix a landscape bug with iOS.
      size.width++;
      size.height++;
    }
    for (var i = 0; i < renderables.length; i++) {
      renderables[i].resize(size);
    }
  }

  function onDocumentKeyDown(event) {
    var processed = false;
    for (var i = 0; i < renderables.length; i++) {
      if (renderables[i].onKeyDown) {
        processed |= renderables[i].onKeyDown(event.keyCode);
      }
    }
    if (processed) {
      event.preventDefault();
    }
  }

  function onDocumentKeyPress(event) {
    var processed = false;
    for (var i = 0; i < renderables.length; i++) {
      if (renderables[i].onKeyPress) {
        processed |= renderables[i].onKeyPress(event.keyCode);
      }
    }
    if (processed) {
      event.preventDefault();
    }
  }

  function onDocumentMouseDown(event) {
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('mouseup', onDocumentMouseUp, false);
    document.addEventListener('mouseout', onDocumentMouseUp, false);

    var coord = getUnitCoord(event.clientX, event.clientY);
    var processed = false;
    for (var i = 0; i < renderables.length; i++) {
      if (renderables[i].onMouseDown) {
        processed |= renderables[i].onMouseDown(coord, event);
      }
    }
    if (processed) {
      event.preventDefault();
    }
  }

  function onDocumentMouseMove(event) {
    var coord = getUnitCoord(event.clientX, event.clientY);
    var processed = false;
    for (var i = 0; i < renderables.length; i++) {
      if (renderables[i].onMouseMove) {
        processed |= renderables[i].onMouseMove(coord);
      }
    }
    if (processed) {
      event.preventDefault();
    }
  }

  function onDocumentMouseUp(event) {
    document.removeEventListener('mousemove', onDocumentMouseMove, false);
    document.removeEventListener('mouseup', onDocumentMouseUp, false);
    document.removeEventListener('mouseout', onDocumentMouseUp, false);

    for (var i = 0; i < renderables.length; i++) {
      if (renderables[i].onMouseUp) {
        renderables[i].onMouseUp();
      }
    }
  }

  function onDocumentTouchStart(event) {
    document.addEventListener('touchmove', onDocumentTouchMove, false);
    document.addEventListener('touchend', onDocumentTouchEnd, false);
    document.addEventListener('touchcancel', onDocumentTouchEnd, false);

    if (event.touches.length == 1) {
      var coord = getUnitCoord(
          event.touches[0].clientX, event.touches[0].clientY);
      var processed = false;
      for (var i = 0; i < renderables.length; i++) {
        if (renderables[i].onMouseDown) {
          processed |= renderables[i].onMouseDown(coord);
        }
      }
      if (processed) {
        event.preventDefault();
      }
    }
  }

  function onDocumentTouchMove(event) {
    if (event.touches.length == 1) {
      var processed = false;
      var coord = getUnitCoord(
          event.touches[0].clientX, event.touches[0].clientY);
      for (var i = 0; i < renderables.length; i++) {
        if (renderables[i].onMouseMove) {
          processed |= renderables[i].onMouseMove(coord);
        }
      }
      // Prevent scrolls.
      if (processed) {
        event.preventDefault();
      }
    }
  }

  function onDocumentTouchEnd(event) {
    document.removeEventListener('touchmove', onDocumentTouchMove, false);
    document.removeEventListener('touchend', onDocumentTouchEnd, false);
    document.removeEventListener('touchcancel', onDocumentTouchEnd, false);

    for (var i = 0; i < renderables.length; i++) {
      if (renderables[i].onMouseUp) {
        renderables[i].onMouseUp();
      }
    }
  }

  onWindowResize();
  registerEventHandlers();

}

