import React from "react";
import { Box, Button, Grid, Paper } from "@material-ui/core";
import { Field, Form, Formik } from "formik";
import { TextField } from "formik-material-ui";
import InputAdornment from "@material-ui/core/InputAdornment";
import PersonIcon from "@material-ui/icons/Person";
import EmailIcon from "@material-ui/icons/Email";
import { useSelector } from "react-redux";
import regex from "../../utilities/regex";
import { awaiter } from "../../utilities/async";
import { makeStyles } from "@material-ui/core/styles";

const validateName = (value) => {
  let error;
  if (value.length < 5) {
    error = "Must have at least 5 characters";
  }
  return error;
};

const validateEmail = async (value) => {
  let error;
  if (!regex.isEmailAddress(value)) {
    error = "Pattern mismatch";
  } else {
    const [error2, result] = await awaiter(
      fetch(
        `http://localhost:30000/v1/users?email=${encodeURIComponent(value)}`,
        {
          method: "HEAD",
        },
      ),
    );
    if (!error2 && result.ok) {
      error = "Already registered";
    }
  }
  return error;
};

const useStyles = makeStyles((theme) => ({
  margin: {
    margin: theme.spacing(1),
  },
}));

export default (props) => {
  const classes = useStyles();

  const { user } = useSelector((state) => state.user);

  return (
    <React.Fragment>
      <Grid container justify="center">
        <Paper variant="outlined">
          <Box m={1}>
            <Formik
              initialValues={{ name: user.name, email: user.email }}
              onSubmit={(values) => console.log(JSON.stringify(values))}
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
                    <Grid container justify="flex-end" direction="row">
                      <Button
                        color="primary"
                        disabled={isSubmitting}
                        size="large"
                        style={{ margin: 8 }}
                        type="submit"
                        variant="contained"
                      >
                        Update
                      </Button>
                    </Grid>
                  </div>
                </Form>
              )}
            </Formik>
          </Box>
        </Paper>
      </Grid>
    </React.Fragment>
  );
};
