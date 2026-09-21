import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {Box, Grid, Paper} from "@material-ui/core";
import AccountBoxIcon from '@material-ui/icons/AccountBox';
import BusinessIcon from '@material-ui/icons/Business';
import FlagIcon from '@material-ui/icons/Flag';
import NotificationsIcon from '@material-ui/icons/Notifications';
import PropTypes from 'prop-types';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import DashboardProfileTab from "./DashboardProfileTab.js";
import DashboardOrganizationsTab from "./DashboardOrganizationsTab";

const TabPanel = (props) => {
	const { children, value, index, ...other } = props;

	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`vertical-tabpanel-${index}`}
			aria-labelledby={`vertical-tab-${index}`}
			{...other}
		>
			{value === index && (
				<Box p={3}>
					<Typography component={'span'}>{children}</Typography>
				</Box>
			)}
		</div>
	);
};

TabPanel.propTypes = {
	children: PropTypes.node,
	index: PropTypes.any.isRequired,
	value: PropTypes.any.isRequired,
};

const a11yProps = (index, classes) => {
	return {
		id: `vertical-tab-${index}`,
		'aria-controls': `vertical-tabpanel-${index}`,
		'className': classes.tab
	};
};

const useStyles = makeStyles((theme) => ({
	paper: {
		padding: theme.spacing(1),
		textAlign: 'center',
		color: theme.palette.text.primary,
	},
	tabs: {
		borderLeft: `1px solid ${theme.palette.divider}`,
	},
	tab: {
		textTransform: 'none',
	},
	indicator: {
		left: "0px"
	},
}));

export default function DashboardTabs() {
	const classes = useStyles();

	const [value, setValue] = React.useState(0);

	const handleChange = (event, newValue) => {
		setValue(newValue);
	};

	return (
		<div>
			<Box m={3} />
			<Grid container justify="center">
				<Grid container justify="center" item xs={10} spacing={3}>
					<Grid item xs={3}>
						<Paper className={classes.paper} style={{ padding: 0 }}>
							<Tabs
								classes={{
									indicator: classes.indicator,
								}}
								className={classes.tabs}
								indicatorColor="primary"
								onChange={handleChange}
								orientation="vertical"
								value={value}
								variant="fullWidth"
							>
								<Tab label={<div><AccountBoxIcon style={{verticalAlign: 'top'}} /> Profile</div>} {...a11yProps(0, classes)} />
								<Tab label={<div><BusinessIcon style={{verticalAlign: 'top'}} /> Organizations</div>} {...a11yProps(1, classes)} />
								<Tab label={<div><FlagIcon style={{verticalAlign: 'top'}} /> Language &amp; Region</div>} {...a11yProps(2, classes)} />
								<Tab label={<div><NotificationsIcon style={{verticalAlign: 'top'}} /> Notifications</div>} {...a11yProps(3, classes)} />
							</Tabs>
						</Paper>
					</Grid>
					<Grid item xs={7}>
						<Paper className={classes.paper}>
							<TabPanel value={value} index={0}>
								<DashboardProfileTab />
							</TabPanel>
							<TabPanel value={value} index={1}>
								<DashboardOrganizationsTab />
							</TabPanel>
							<TabPanel value={value} index={2}>
								Item Three
							</TabPanel>
							<TabPanel value={value} index={3}>
								Item Four
							</TabPanel>
						</Paper>
					</Grid>
				</Grid>
			</Grid>
		</div>
	);
}