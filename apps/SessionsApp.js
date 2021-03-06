'use strict'

const { BaseApp } = require('./BaseApp')

const INVALID_FORMAT = { code: 'INVALID_FORMAT' }

// This mini app serves the API endpoints for session management.
class SessionsApp extends BaseApp {
  constructor (opts) {
    var options = opts || {}
    super(options)
    if (!options.session) {
      throw new Error('APP_SESSION_ADAPTER_REQUIRED')
    }
    if (!options.database) {
      throw new Error('APP_DATABASE_ADAPTER_REQUIRED')
    }
    if (!options.password) {
      throw new Error('APP_PASSWORD_ADAPTER_REQUIRED')
    }
    this.session = options.session
    this.database = options.database
    this.password = options.password
    this.table = options.table || 'users'

    this.build()
  }

  // POST /session
  signIn (req, res) {
    var primaryField = this.session.fields.primary
    var passwordField = this.session.fields.password
    var primaryValue = req.body[primaryField]
    var passwordValue = req.body[passwordField]
    if (typeof primaryValue !== 'string' || typeof passwordValue !== 'string') {
      res.status(400).json(INVALID_FORMAT)
      return
    }
    var conditions = [[primaryField, '=', primaryValue]]
    this
      .database
      .query(
        req, res,
        this.table, conditions,
        this.signInQueryResult
      )
  }

  signInQueryResult (err, req, res, results) {
    if (err) {
      this.error(err, req, res, 'signInQueryResult')
      return
    }
    if (!results || results.length === 0) {
      res.status(401).end()
      return
    }
    var user = results[0]
    res.locals.signInUser = user
    var passwordField = this.session.fields.password
    this
      .password
      .validate(
        req, res,
        user[passwordField], req.body[passwordField],
        this.signInPasswordResult
      )
  }

  signInPasswordResult (err, req, res, valid) {
    if (err) {
      this.error(err, req, res, 'signInPasswordResult')
      return
    }
    if (!valid) {
      res.status(401).end()
      return
    }
    this
      .session
      .create(
        req, res,
        res.locals.signInUser, // set in signInQueryResult()
        this.signInSessionResult
      )
  }

  signInSessionResult (err, req, res) {
    if (err) {
      this.error(err, req, res, 'signInSessionResult')
      return
    }
    res.status(201).json(this.session.data(req, res))
  }

  // DELETE /session
  signOut (req, res) {
    this.session.authorize(req, res, this.signOutAuthorized)
  }

  signOutAuthorized (err, req, res) {
    if (err) {
      this.error(err, req, res, 'signOutAuthorized')
      return
    }
    this.session.destroy(req, res, this.signOutSessionDestroy)
  }

  signOutSessionDestroy (err, req, res) {
    if (err) {
      this.error(err, req, res, 'signOutSessionDestroy')
      return
    }
    this.empty(null, req, res)
  }

  // GET /session
  info (req, res) {
    this.session.authorize(req, res, this.infoAuthorized)
  }

  infoAuthorized (err, req, res, sessionData) {
    if (err) {
      this.error(err, req, res, 'infoAuthorized')
      return
    }
    res.status(200).json(sessionData)
  }

  // HEAD /session
  head (req, res) {
    this.session.authorize(req, res, this.empty)
  }

  bindMethods () {
    super.bindMethods()
    this.signIn = this.signIn.bind(this)
    this.signInQueryResult = this.signInQueryResult.bind(this)
    this.signInPasswordResult = this.signInPasswordResult.bind(this)
    this.signInSessionResult = this.signInSessionResult.bind(this)
    this.signOut = this.signOut.bind(this)
    this.signOutAuthorized = this.signOutAuthorized.bind(this)
    this.signOutSessionDestroy = this.signOutSessionDestroy.bind(this)
    this.info = this.info.bind(this)
    this.infoAuthorized = this.infoAuthorized.bind(this)
    this.head = this.head.bind(this)
  }
}

exports.SessionsApp = SessionsApp
