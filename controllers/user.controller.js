const passport = require('passport');
const userModels = require('../models/user');
const mongoose = require('mongoose');
const jwt = require('../utils/jwt')


function createUser(req, res, next) {
    const newUser = {
        username: req.body.username,
        email: req.body.email,
    }
    const User = new userModels.User(newUser);
    userModels.User.register(User, req.body.password, (err, user) => {
        if (err) {
            return res.status(500).json({
                status: "fail",
                message: " user not created  :try again",
                error: err
            })
        }
        if (!user) {
            return res.status(500).json({
                status: "fail",
                message: " user not created  :try again",
            })
        }
        req.login(user, function (err) {
            if (err) return res.status(500).json({
                status: "fail",
                message: "failed to create session",
                error: err
            });
            
            // Successfully authenticated and session created
            req.session.token = jwt.generateToken(req.user);
            res.status(201).render('home',{
                status: "success",
                message: " user created"
            })
            return next()
        });

    })
}

function userLogin(req, res, next) {
    passport.authenticate('local', function (err, user) {
        if (!user) return res.status(403).json({
            status: "fail",
            message: "incorrect username or password "
        })
        if (err) return res.status(500).json({
            status: "fail",
            message: "failed to authenticate user",
            error: err
        })
        req.login(user, function (err) {
            if (err) return res.status(500).json({
                status: "fail",
                message: "failed to create session",
                error: err
            });
            // Successfully authenticated and session created
            res.locals.currentUser = req.user
            req.session.token = jwt.generateToken(req.user);
            if (req.user.role === 'admin') {
                 res.status(200).json({
                    status: 'success',
                    message: 'authentication success',
                    redirect: '/admin/panel'
                })
                return next()
            }
            res.status(201).render('home',{
                status: "success",
                message: " user created"
            })
            return next()
        });
    })(req, res, next)
}

function deleteUser(req, res, next) {
    const uId = mongoose.Types.ObjectId.createFromHexString(req.query.id);
    userModels.User.findByIdAndDelete(uId)
        .then((deletedAccount) => {
            res.status(200).json({
                status: 'success',
                message: `Account: "${deletedAccount.username}" deleted successfully`,
                redirect: '/signUp'
            })
            return next()
        }).catch((err) => {
            return res.status(500).json({
                status: 'fail',
                message: `could not delete account`,
                error: err
            })
        });
}
function updateUserProfile(req, res, next) {
    const userId = req.user._id;
    const updateData = {
        username: req.body.username,
        email: req.body.email,
    };

    userModels.User.findByIdAndUpdate(userId, updateData, { new: true })
        .then((updatedUser) => {
            if (!updatedUser) {
                return res.status(404).json({
                    status: 'fail',
                    message: 'User not found'
                });
            }
            if (req.body.password) {
                updatedUser.setPassword(req.body.password, (err) => {
                    if (err) {
                        return res.status(500).json({
                            status: 'fail',
                            message: 'Failed to update password',
                            error: err
                        });
                    }
                    updatedUser.save()
                        .then(() => {
                            res.status(200).json({
                                status: 'success',
                                message: 'Profile updated successfully',
                                user: updatedUser
                            });
                            return next();
                        })
                        .catch((err) => {
                            return res.status(500).json({
                                status: 'fail',
                                message: 'Failed to save updated user',
                                error: err
                            });
                        });
                });
            } else {
                res.status(200).json({
                    status: 'success',
                    message: 'Profile updated successfully',
                    user: updatedUser
                });
                return next();
            }
        })
        .catch((err) => {
            return res.status(500).json({
                status: 'fail',
                message: 'Failed to update profile',
                error: err
            });
        });
}
function logout(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.status(500).json({
            status: 'fail',
            message: 'Session unset'
        })
    }
    req.logout((err) => {
        if (err) {
            return res.status(500).json({
                status: 'fail',
                message: 'Error logging out user',
                error: err,
            })
        }
        res.status(200).json({
            status: 'success',
            message: 'successfully logged out',
            redirect: '/login'
        })
        return next()
    })


}

function googleLogin(req, res, next) {
    passport.authenticate('google', { scope: ['profile'] })(req, res, next);
}

module.exports = {logout, userLogin, createUser, deleteUser, updateUserProfile, googleLogin}