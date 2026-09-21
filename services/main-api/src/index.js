const app = require('express')();
const bodyParser = require('body-parser-graphql');
const boom = require('express-boom');
//const cors = require('cors');

const badges = require('./v1/endpoints/badges');
const organizations = require('./v1/endpoints/organizations');
const points = require('./v1/endpoints/points');
const tallies = require('./v1/endpoints/tallies');
const teams = require('./v1/endpoints/teams');
const users = require('./v1/endpoints/users');

app.use(bodyParser.graphql());
app.use(boom());
//app.use(cors());

app.post('/:version/badges', badges.defaultHandler);
app.post('/:version/organizations', organizations.defaultHandler);
app.post('/:version/points', points.defaultHandler);
app.post('/:version/tallies', tallies.defaultHandler);
app.post('/:version/teams', teams.defaultHandler);
app.post('/:version/users', users.defaultHandler);

app.listen(3000);
