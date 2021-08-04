const config = require('config.json');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('_helpers/db');

module.exports = {
    authenticate,
    getAll,
    getById,
    create,
    update,
    delete: _delete,
    getDriverbyRoute
};

async function authenticate({ username, password }) {
    const driver = await db.Driver.scope('withHash').findOne({ where: { username } });

    if (!driver || !(await bcrypt.compare(password, driver.hash)))
        throw 'Username or password is incorrect';

    // authentication successful
    const token = jwt.sign({ sub: driver.id, email: driver.email, role: driver.role }, config.secret, { expiresIn: '7d' });
    return { ...omitHash(driver.get()), token };
}

async function getAll() {
    return await db.Driver.findAll();
}

async function getById(id) {
    return await getUser(id);
}

async function create(params) {
    // validate
    if (await db.Driver.findOne({ where: { username: params.username } })) {
        throw 'Username "' + params.username + '" is already taken';
    }

    // hash password
    if (params.password) {
        params.hash = await bcrypt.hash(params.password, 10);
    }

    // save driver
    await db.Driver.create(params);
}

async function update(id, params) {
    const driver = await getUser(id);

    // validate
    const usernameChanged = params.username && driver.username !== params.username;
    if (usernameChanged && await db.Driver.findOne({ where: { username: params.username } })) {
        throw 'Username "' + params.username + '" is already taken';
    }

    // hash password if it was entered
    if (params.password) {
        params.hash = await bcrypt.hash(params.password, 10);
    }

    // copy params to driver and save
    Object.assign(driver, params);
    await driver.save();

    return omitHash(driver.get());
}

async function _delete(id) {
    const driver = await getUser(id);
    await driver.destroy();
}

// helper functions

async function getUser(id) {
    const driver = await db.Driver.findByPk(id);
    if (!driver) throw 'Driver not found';
    return driver;
}

function omitHash(driver) {
    const { hash, ...userWithoutHash } = driver;
    return userWithoutHash;
}

async function getDriverbyRoute(route) {
    const driver = await db.Driver.findAll({where: {route: route}});
    if (!driver) throw 'Driver not found';
    return driver;
}

