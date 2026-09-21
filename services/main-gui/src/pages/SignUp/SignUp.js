import React from "react";
import { Link, Redirect } from "react-router-dom";
import Header from "../../components/Header";

import {Field, Form, Formik} from "formik";
import {Box, Button, Grid, Paper} from '@material-ui/core';

import { TextField } from 'formik-material-ui';

import InputAdornment from '@material-ui/core/InputAdornment';

import {useDispatch, useSelector} from "react-redux";
import {signup} from "../../reducers/user.js";

import EmailIcon from '@material-ui/icons/Email';
import KeyIcon from '@material-ui/icons/VpnKey';
import PersonIcon from "@material-ui/icons/Person";

import { makeStyles } from '@material-ui/core/styles';
import { awaiter } from "../../utilities/async.js";
import regex from "../../utilities/regex";

const useStyles = makeStyles((theme) => ({
	margin: {
		margin: theme.spacing(1),
	},
}));

const validateName = (value) => {
	let error;
	if (value.length < 5) {
		error = "Must have at least 5 characters";
	}
	return error;
}

const validateEmail = async (value) => {
	let error;
	if (!regex.isEmailAddress(value)) {
		error = 'Pattern mismatch';
	}
	else {
		const [error2, result] = await awaiter(fetch(`http://localhost:30000/v1/users?email=${encodeURIComponent(value)}`, {
			method: 'HEAD',
		}));
		if (!error2 && result.ok) {
			error = 'Already registered';
		}
	}
	return error;
}

const validatePassword = (value) => {
	let error;
	if (value.length < 8) {
		error = "Must have at least 8 characters";
	}
	else if (value.search(/[a-z]/) < 0) {
		error = "Must have at least 1 lowercase letter";
	}
	else if (value.search(/[A-Z]/) < 0) {
		error = "Must have at least 1 uppercase letter";
	}
	else if (value.search(/[0-9]/) < 0) {
		error = "Must have at least 1 number";
	}
	return error;
}
/*
const validateConfirmPassword = (value) => {
	let error;
	return error;
}
*/
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
								<div style={{ fontSize: 35 }}>Sign-Up</div>
							</Box>
						</Grid>
						<Box m={3} />
						<Grid container justify="center">
							<Paper variant="outlined">
								<Box m={1}>
									<Formik
										initialValues={{ name: "", email: "", password: "", confirm_password: "" }}
										onSubmit={(values) => dispatch(signup(values))}
									>
										{({ touched, isSubmitting }) => (
											<Form>
												<div>
													<Grid container>
														<Field
															component={TextField}
															className={classes.margin}
															defaultValue={touched.name}
															label="Display Name"
															name="name"
															required
															InputProps={{
																startAdornment: (
																	<InputAdornment position="start">
																		<PersonIcon />
																	</InputAdornment>
																),
															}}
															style={{ width: 300 }}
															type="text"
															validate={validateName}
															variant="outlined"
														/>
													</Grid>
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
													<Grid container>
														<Field
															component={TextField}
															className={classes.margin}
															defaultValue={touched.confirm_password}
															label="Confirm Password"
															name="confirm_password"
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
															variant="outlined"
														/>
													</Grid>
													<Grid container style={{ margin: 8 }}>
														<div align="justify" style={{ fontSize: 13 }}>
															By clicking &quot;Create,&quot; you agree to SelectiveDepth&apos;s<br />
															<Link to="/policies">terms</Link>, <Link to="/policies">privacy policy</Link>, and <Link to="/policies">cookie policy</Link>.
														</div>
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
															Create
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
									<Link to="/signin" style={{ textDecoration: 'none' }}>Already have an account?</Link>
								</Box>
							</Paper>
						</Grid>
					</Box>
				</Paper>
			</Grid>
		</div>
	);
}
