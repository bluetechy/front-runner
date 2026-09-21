import React from "react";
import { Link, Redirect } from "react-router-dom";
import Header from "../../components/Header";

import {Field, Form, Formik} from "formik";
import {Box, Button, Grid, Paper} from '@material-ui/core';

import { TextField } from 'formik-material-ui';

import InputAdornment from '@material-ui/core/InputAdornment';

import {useDispatch, useSelector} from "react-redux";
import {signin} from "../../reducers/user.js";

import EmailIcon from '@material-ui/icons/Email';
import KeyIcon from '@material-ui/icons/VpnKey';

import { makeStyles } from '@material-ui/core/styles';

import regex from '../../utilities/regex.js';

const useStyles = makeStyles((theme) => ({
	margin: {
		margin: theme.spacing(1),
	},
}));

const validateEmail = (value) => {
	let error;
	if (!regex.isEmailAddress(value)) {
		error = 'Invalid email address';
	}
	return error;
}

const validatePassword = (value) => {
	let error;
	if (!regex.isPassword(value)) {
		error = 'Invalid password';
	}
	return error;
}

export default props => {
	const classes = useStyles();
	const dispatch = useDispatch();

	const { user } = useSelector(state => state.user);
	if (user) {
		return (
			<Redirect to={'/dashboard'} />
		);
	}

	return (
		<div>
			<Header title="SelectiveDepth" />
			<Box m={3} />
			<Grid container justify="center">
				<Paper variant="outlined">
					<Box m={2}>
						<Grid container justify="center">
							<Box
								m={1}
								p={1}
								style={{ width: 300 }}
								display="flex"
								justifyContent="center"
								alignItems="center"
							>
								<div style={{ fontSize: 35 }}>Sign-In</div>
							</Box>
						</Grid>
						<Box m={3} />
						<Grid container justify="center">
							<Paper variant="outlined">
								<Box m={1}>
									<Formik
										initialValues={{ email: "", password: "" }}
										onSubmit={(values) => dispatch(signin(values))}
									>
										{({ touched, isSubmitting }) => (
											<Form>
												<div>
													<Grid container>
														<Field
															component={TextField}
															className={classes.margin}
															defaultValue={touched.email}
															label="Email"
															name="email"
															required
															InputProps={{
																startAdornment: (
																	<InputAdornment position="start">
																		<EmailIcon />
																	</InputAdornment>
																),
															}}
															style={{ width: 300 }}
															type="text"
															validate={validateEmail}
															variant="outlined"
														/>
													</Grid>
													<Grid container>
														<Field
															component={TextField}
															className={classes.margin}
															defaultValue={touched.password}
															label="Password"
															name="password"
															required
															InputProps={{
																startAdornment: (
																	<InputAdornment position="start">
																		<KeyIcon />
																	</InputAdornment>
																),
															}}
															style={{ width: 300 }}
															type="password"
															validate={validatePassword}
															variant="outlined"
														/>
													</Grid>
													<Grid container justify="flex-end" direction="row">
														<Button
															color="primary"
															disabled={isSubmitting}
															size="large"
															style={{ margin: 8 }}
															type="submit"
															variant="contained"
														>
															Login
														</Button>
													</Grid>
												</div>
											</Form>
										)}
									</Formik>
								</Box>
							</Paper>
						</Grid>
						<Box m={3} />
						<Grid container justify="center">
							<Paper variant="outlined">
								<Box
									m={1}
									p={1}
									style={{ width: 300 }}
									display="flex"
									justifyContent="center"
									alignItems="center"
								>
									<Link to="/signup" style={{ textDecoration: 'none' }}>Want to create an account?</Link>
								</Box>
							</Paper>
						</Grid>
					</Box>
				</Paper>
			</Grid>
		</div>
	);
}
