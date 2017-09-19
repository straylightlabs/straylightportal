import React from 'react';
import {Card, CardActions, CardMedia, CardTitle, CardText} from 'material-ui/Card';
import FlatButton from 'material-ui/FlatButton';
import FontIcon from 'material-ui/FontIcon';
import Divider from 'material-ui/Divider';
import loginImage from '../static/images/login-card.png';

export default () => (
  <Card style={styles.card}>
    <CardMedia
      overlay={<CardTitle title="Connect" />}>
      <img src={loginImage} />
    </CardMedia>
    <CardText>
      A point of intersection. A beginning and an end. Connect here.
    </CardText>
    <Divider />
    <CardActions>
      <FlatButton
        label="Login"
        href="http://www.google.co.jp"
        icon={<FontIcon className="fa fa-google-plus" />}
      />
    </CardActions>
  </Card>
);

const styles = {
  card: {
    maxWidth: 500,
    marginTop: 50,
    marginRight: 'auto',
    marginLeft: 'auto'
  }
};

