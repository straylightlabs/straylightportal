// App.jsx
// @flow

import React from 'react';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import injectTapEventPlugin from 'react-tap-event-plugin';
import Login from './Login';

// Needed for onTouchTap
// http://stackoverflow.com/a/34015469/988941
injectTapEventPlugin();

export default () => (
  <MuiThemeProvider>
    <Login />
  </MuiThemeProvider>
);


