'use strict';

function hereString(functionWithComment, replaceDict) {
  var str = functionWithComment.toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1];
  for (var key in replaceDict) {
    str = str.split(key).join(replaceDict[key]);
  }
  return str;
}

function cloneOrGet(v) {
  if (v && v.clone !== undefined) {
    return v.clone();
  } else {
    return v;
  }
}

function Queue(size, initialValue) {
  this.elements = [];
  this.index = 0;

  for (var i = 0; i < size; i++) {
    this.elements.push(cloneOrGet(initialValue));
  }

  this.add = function(value) {
    if (this.index < this.elements.length) {
      this.elements[this.index] = value;
      this.index++;
    } else {
      this.elements.shift();
      this.elements.push(value);
    }
  };

  this.forEach = function(func) {
    for (var i = 0; i < this.index; i++) {
      if (func(this.elements[i])) {
        break;
      }
    }
  };

  this.clone = function() {
    var cloned = new Queue(size, initialValue);
    for (var i = 0; i < this.elements.length; i++) {
      cloned.elements[i] = cloneOrGet(this.elements[i]);
    }
    cloned.index = this.index;
    return cloned;
  };

  this.clear = function() {
    this.index = 0;
    for (var i = 0; i < this.elements.length; i++) {
      this.elements[i] = cloneOrGet(initialValue);
    }
  };
}

function Task() {
  this.numChildTasks = 0;

  this.add = function() {
    this.numChildTasks++;
    return function() {
      if (--this.numChildTasks == 0) {
        this.doneClosure();
      }
    }.bind(this);
  };

  this.done = function(doneClosure) {
    if (this.numChildTasks == 0) {
      doneClosure();
    } else {
      this.doneClosure = doneClosure;
    }
  };
}

function getDPR() {
  // scale for retina.
  return Math.min(1.5, window.devicePixelRatio);
}

function isIOS() {
  return /(iPhone|iPad|iPod)/i.test(window.navigator.userAgent);
}

function isAndroid() {
  return navigator.userAgent.toLowerCase().indexOf("android") > -1;
}

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isSafari() {
  return navigator.userAgent.indexOf("Safari") > -1;
}

function isFacebookApp() {
  var ua = navigator.userAgent || navigator.vendor || window.opera;
  return (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1);
}

Math.fract = function(v) {
  return v - Math.floor(v);
};

Math.mix = function(v1, v2, ratio) {
  return v1 * (1 - ratio) + v2 * ratio;
};

// Equivalent to GLSL smoothstep, but with more smoothness.
function smoothstep(edge0, edge1, x) {
  // Scale, bias and saturate x to 0..1 range
  x = Math.min(Math.max((x - edge0)/(edge1 - edge0), 0.0), 1.0); 
  // Evaluate polynomial
  return x * x * (3. - 2. * x);
}

// A deterministic random function.
// The same one used by shaders.
function rand(t) {
  var wave = Math.sin(t * 12.9898);
  return Math.fract(wave * 43758.5453123);
}

// 1-dimentional Perlin noise.
function pnoise(t, t1, t2) {
  var i = Math.floor(t);
  var f = Math.fract(t);
  var y = smoothstep(t1 || 0.5, t2 || 1.0, Math.mix(rand(i), rand(i + 1.0), smoothstep(0., 1., f)));
  return y;
}

function isFirstTimeVisitor() {
  const VISITED_TOKEN = 'visited=true';
  if (document.cookie.split('; ').indexOf(VISITED_TOKEN) >= 0) {
    return false;
  }
  document.cookie = VISITED_TOKEN;
  return true;
}

function getUserLanguageTag() {
  var lang = navigator.language || navigator.userLanguage;
  return lang.split('-')[0];
}

