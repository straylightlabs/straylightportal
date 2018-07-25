var SMALL_VOLUME = 0.001;

function ReverbPool(size) {
  this.pool = [];
  this.nextIndex = 0;
  for (var i = 0; i < size; i++) {
    this.pool.push(new Pizzicato.Effects.Reverb({
        decay: 0.01,
        time: 1.0,
        mix: 0.2,
    }));
  }

  this.get = function() {
    var rv = this.pool[this.nextIndex];
    this.nextIndex = (this.nextIndex + 1) % size;
    return rv;
  };
}

function Sound(task) {
  this.sounds = [];
  this.limitChannels = isMobile() || isSafari();
  this.reverbPool = new ReverbPool(this.limitChannels ? 3 : 15);

  var files = {
      'background1': '/sound/background3.mp3',
      'background2': '/sound/background2.mp3',
      'sound1_raw': '/sound/sound1.mp3',
      'sound2_raw': '/sound/sound2.mp3',
      'sound3_raw': '/sound/sound3.mp3',
      'static': '/sound/light2.mp3',
  };

  var done = task.add();
  var numRemainingLoads = Object.keys(files).length;
  for (var id in files) {
    this.sounds[id] = new Pizzicato.Sound({
        source: 'file',
        options: { path: files[id] },
    }, function() {
      if (--numRemainingLoads == 0) {
        this.init();
        done();
      }
    }.bind(this));
  }

  $(window).focus(function() {
    Pizzicato.volume = 1.0;
  }).blur(function() {
    Pizzicato.volume = 0.0;
  });
};

Sound.prototype.initSound1 = function() {
  this.sound1LowPassFilter = new Pizzicato.Effects.LowPassFilter({ peak: 15 });
  this.sound1DelayFilter = new Pizzicato.Effects.Delay({
      feedback: 0.5,
      time: 0.5,
      mix: 0.2,
  });
  this.sound1ReverbFilter = this.reverbPool.get();

  this.sounds['sound1'] = this.sounds['sound1_raw'].clone();
  this.sounds['sound1'].volume = SMALL_VOLUME;
  this.sounds['sound1'].attack = 2.0;
  this.sounds['sound1'].sustain = 2.5;
  this.sounds['sound1'].addEffect(this.sound1LowPassFilter);
  this.sounds['sound1'].addEffect(this.sound1DelayFilter);
  this.sounds['sound1'].addEffect(this.sound1ReverbFilter);
  return this.sounds['sound1'];
};

Sound.prototype.initSound2 = function() {
  this.sound2StereoPanner = new Pizzicato.Effects.StereoPanner();
  this.sound2LowPassFilter = new Pizzicato.Effects.LowPassFilter({ peak: 15 });
  this.sound2DelayFilter = new Pizzicato.Effects.Delay({
      feedback: 0.5,
      time: 0.5,
      mix: 0.1,
  });
  this.sound2ReverbFilter = this.reverbPool.get();

  this.sounds['sound2'] = this.sounds['sound2_raw'].clone();
  this.sounds['sound2'].volume = 0.35;
  this.sounds['sound2'].attack = 5.0;
  this.sounds['sound2'].sustain = 2.0;
  this.sounds['sound2'].addEffect(this.sound2StereoPanner);
  this.sounds['sound2'].addEffect(this.sound2LowPassFilter);
  this.sounds['sound2'].addEffect(this.sound2DelayFilter);
  this.sounds['sound2'].addEffect(this.sound2ReverbFilter);
  return this.sounds['sound2'];
};

Sound.prototype.initSound3 = function() {
  this.sound3StereoPanner = new Pizzicato.Effects.StereoPanner();
  this.sound3LowPassFilter = new Pizzicato.Effects.LowPassFilter({ peak: 16 });
  this.sound3DelayFilter = new Pizzicato.Effects.Delay({
      feedback: 0.5,
      time: 0.5,
      mix: 0.1,
  });
  this.sound3ReverbFilter = this.reverbPool.get();

  this.sounds['sound3'] = this.sounds['sound3_raw'].clone();
  this.sounds['sound3'].volume = SMALL_VOLUME;
  this.sounds['sound3'].attack = 3.0;
  this.sounds['sound3'].sustain = 1.0;
  this.sounds['sound3'].addEffect(this.sound3LowPassFilter);
  this.sounds['sound3'].addEffect(this.sound3DelayFilter);
  this.sounds['sound3'].addEffect(this.sound3ReverbFilter);
  this.sounds['sound3'].addEffect(this.sound3StereoPanner);
  return this.sounds['sound3'];
};

Sound.prototype.initStatic = function() {
  this.staticDelayFilter = new Pizzicato.Effects.Delay({
      feedback: 0.5,
      time: 1.0,
      mix: 0.5,
  });
  this.staticReverbFilter = new Pizzicato.Effects.Reverb({
      decay: 0.01,
      time: 3.0,
      mix: 0.5,
  });

  this.sounds['static'].volume = 0.1;
  this.sounds['static'].loop = true;
  this.sounds['static'].attack = FADE_DURATION;
  this.sounds['static'].addEffect(this.staticDelayFilter);
  this.sounds['static'].addEffect(this.staticReverbFilter);
};

Sound.prototype.init = function() {
  this.sounds['background1'].volume = 0.2;
  this.sounds['background1'].attack = 2.0;
  this.sounds['background1'].sustain = 2.0;

  this.sounds['background2'].volume = 0.1;
  this.sounds['background2'].attack = 2.0;
  this.sounds['background2'].sustain = 2.0;

  if (this.limitChannels) {
    this.initSound1();
    this.initSound2();
    this.initSound3();
  }
  this.initStatic();
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

Sound.prototype.playBackground1 = function() {
  this.playLoopById('background1', 40);
};

Sound.prototype.stopBackground1 = function() {
  this.stopLoopById('background1');
};

Sound.prototype.playBackground2 = function() {
  this.playLoopById('background2', 40);
};

Sound.prototype.stopBackground2 = function() {
  this.stopLoopById('background2');
};

Sound.prototype.playStatic = function() {
  this.sounds['static'].play();
};

Sound.prototype.stopStatic = function() {
  this.sounds['static'].stop();
};

Sound.prototype.stopById = function(id) {
  this.sounds[id].stop();
};

Sound.prototype.playForeground = function() {
  if (this.limitChannels) {
    this.sounds['sound1'] = this.sounds['sound1'].clone();
    this.sounds['sound2'] = this.sounds['sound2'].clone();
    this.sounds['sound3'] = this.sounds['sound3'].clone();

    this.sounds['sound1'].play();
    this.sounds['sound2'].play();
    this.sounds['sound3'].play();
  } else {
    this.initSound1().play();
    this.initSound2().play();
    this.initSound3().play();
  }
};

Sound.prototype.stopForeground = function() {
  if (this.sounds['sound1'] === undefined) {
    return;
  }
  this.sounds['sound1'].stop();
  this.sounds['sound2'].stop();
  this.sounds['sound3'].stop();
};

Sound.prototype.update = function(masterIntensity, intensity, pan) {
  this.sounds['sound1'].volume = 0.05 + masterIntensity * 0.05;
  this.sounds['sound1'].sustain = 2.5 + masterIntensity * 1.5;
  this.sound1LowPassFilter.frequency = 1300 + masterIntensity * 5000;

  this.sounds['sound2'].sustain = 2.0 + masterIntensity * 1.5;
  this.sound2StereoPanner.pan = pan * 0.8;
  this.sound2LowPassFilter.frequency = 300 + (masterIntensity + intensity) * 2000;

  this.sounds['sound3'].volume = SMALL_VOLUME + 0.1 * intensity;
  this.sounds['sound3'].sustain = 1.0 + masterIntensity;
  this.sound3StereoPanner.pan = pan * 0.8;
  this.sound3LowPassFilter.frequency = 300 + intensity * 800;
};

Sound.prototype.updateStatic = function(intensity) {
  this.sounds['static'].volume = intensity * 0.02;
};

