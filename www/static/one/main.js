'use strict';

$(function() {

  if (!Detector.webgl) {
    cga('event', 'Error', 'NonWebGL');
    return;
  }

  THREE.Cache.enabled = true;

  var container = document.createElement('div');
  document.body.appendChild(container);

  var renderables = [];
  var task = new Task();

  // TODO(ryok): Check if the sound issue is persisting with Android.
  var sound = isAndroid() ? null : new Sound(task);

  var backgroundMode = true;
  var animation = new Animation(task, sound, backgroundMode);
  container.appendChild(animation.renderer.domElement);
  renderables.push(animation);

  var driver = new Driver(renderables);
  task.done(function() {
    driver.render();
  });

});

