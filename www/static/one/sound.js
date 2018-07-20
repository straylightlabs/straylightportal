function Sound(task) {
  this.sounds = [];

  var done = task.add();
  this.sounds['background'] = new Pizzicato.Sound({
      source: 'file',
      options: { path: '/sound/background2.mp3' },
  }, function() {
    this.init();
    done();
  }.bind(this));

  $(window).focus(function() {
    Pizzicato.volume = 1.0;
  }).blur(function() {
    Pizzicato.volume = 0.0;
  });
};

Sound.prototype.init = function() {
  this.sounds['background'].volume = 0.1;
  this.sounds['background'].attack = 2.0;
  this.sounds['background'].sustain = 2.0;
};

Sound.prototype.playLoopById = function(id, duration) {
  this.sounds[id].play();
  this.sounds[id].looping = true;
  setTimeout(function() {
    this.sounds[id].stop();
    setTimeout(function() {
      if (this.sounds[id].looping) {
        this.playLoopById(id, duration);
      }
    }.bind(this), this.sounds[id].sustain * 1000);
  }.bind(this), duration * 1000);
};

Sound.prototype.stopLoopById = function(id) {
  this.sounds[id].stop();
  this.sounds[id].looping = false;
};

Sound.prototype.playBackground2 = function() {
  this.playLoopById('background', 40);
};

