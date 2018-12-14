'use strict';

var DEBUG = false;

(function(self) {

  function initPages() {
    if ($.scrollify.current()) {
      return;
    }

    var fadeIn = function() {
      var section = $.scrollify.current();
      var index = section.index() + 1;
      cga('pageview', '/' + index);

      section.find('.fade-in').addClass('complete');

      if (self.sound) {
        if (index == 1) {
          self.sound.playStatic();
        } else {
          self.sound.stopStatic();
        }
      }
    };

    $.scrollify({
      section: 'section',
      before: fadeIn,
    });
  }

  function initScrollButton() {
    var button = $('.button');
    button.click(function() {
      $.scrollify.next();
    });
    setInterval(function() {
      var seconds = new Date().getTime() / 1000;
      button.css('marginTop', Math.floor(5 + 5 * Math.sin(seconds * 2)) + 'px');
    }, 50);
  }

  function initLanguage() {
    function switchLanguage() {
      $('.en').toggle();
      $('.ja').toggle();
      $('.switcher').toggle();
    }

    if (getUserLanguageTag() == 'ja') {
      switchLanguage();
    }
    $('.switcher').click(switchLanguage);
  }

  function initWebGL(continuation) {
    THREE.Cache.enabled = true;

    var clock = new THREE.Clock();
    clock.getDelta();
    console.debug('initWebGL');

    var container = document.createElement('div');
    document.body.appendChild(container);

    var renderables = [];
    var task = new Task();

    self.sound = isAndroid() ? null : new Sound(task);

    console.debug('initWebGL - done sound init');
    cga('timing', 'Init', 'SoundBlocking',
        Math.round(clock.getDelta() * 1000));

    self.animation = new Animation(task, self.sound);
    var domElement = self.animation.renderer.domElement;
    $(domElement).css('position', 'fixed');
    $(domElement).css('overflow', 'hidden');
    container.appendChild(domElement);
    renderables.push(self.animation);

    console.debug('initWebGL - done animation init');
    cga('timing', 'Init', 'AnimationBlocking',
        Math.round(clock.getDelta() * 1000));

    self.logo = new Logo(task, self.sound);
    var domElement = self.logo.renderer.domElement;
    $('#logo').append(domElement);
    renderables.push(self.logo);

    console.debug('initWebGL - done logo init');
    cga('timing', 'Init', 'LogoBlocking',
        Math.round(clock.getDelta() * 1000));

    if (DEBUG) {
      var stats = new Stats();
      stats.animate = function() { stats.update(); };
      container.appendChild(stats.dom);
      renderables.push(stats);
    }

    var driver = new Driver(renderables);
    task.done(function() {
      driver.render();
      $('.loading').hide();

      console.debug('Start rendering');
      cga('timing', 'Init', 'WebGLRender',
          Math.round(clock.getElapsedTime() * 1000));

      continuation();
    });
  }

  function initURLChangeHandler() {
    setTimeout(function() {
      $(window).on('hashchange', function() {
        var index = parseInt(window.location.hash.charAt(1));
        if (index == 0) {
          $('#container').hide();
          $.scrollify.destroy();
          self.logo.enabled = false;
          self.animation.reset();
        } else if (index > 0) {
          $('#hint').hide();
          $('#container').show();
          initPages();
          self.logo.enabled = true;
        }
        cga('pageview', '/' + index);
      });
    }, 500);
  }

  self.init = function() {
    window.location.hash = '#0';
    initScrollButton();
    initLanguage();
    if (Detector.webgl) {
      initWebGL(function() {
        // post processing.
      });
      initURLChangeHandler();
    } else {
      cga('event', 'Error', 'NonWebGL');
      $('#container').show();
    }
  }

}(window.main = window.main || {}));

$(function() {
  // Prevent pull-to-refresh in Chrome.
  document.addEventListener('touchstart', function() {}, {passive: false});
  document.addEventListener('touchmove', function() {}, {passive: false});

  // There is some timing issue with window.innerWidth and Facebook / Twitter
  // embedded browser.
  // https://code.google.com/p/gmaps-api-issues/issues/detail?id=10467
  setTimeout(main.init, 500);
});

