// App.jsx
// @flow

import React from 'react';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import injectTapEventPlugin from 'react-tap-event-plugin';
import {Card, CardActions, CardMedia, CardTitle, CardText} from 'material-ui/Card';
import FlatButton from 'material-ui/FlatButton';
import FontIcon from 'material-ui/FontIcon';

// Needed for onTouchTap
// http://stackoverflow.com/a/34015469/988941
injectTapEventPlugin();

export default () => (
  <MuiThemeProvider>
    <Card>
      <CardMedia
        overlay={<CardTitle title="Connect" />}>
        <img src="images/welcome-card.png" />
      </CardMedia>
      <CardTitle title="Connect" />
      <CardText>
        A point of intersection. A beginning and an end. Connect here.
      </CardText>
      <CardActions>
        <FlatButton
          label="Login"
          href="http://www.google.co.jp"
          icon={<FontIcon className="fa fa-google-plus" />}
        />
      </CardActions>
    </Card>
  </MuiThemeProvider>
);

