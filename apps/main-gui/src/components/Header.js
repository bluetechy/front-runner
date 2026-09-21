import React from 'react';

import AccountCircle from '@material-ui/icons/AccountCircle';
import AppBar from '@material-ui/core/AppBar';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import Menu from '@material-ui/core/Menu';
import MenuIcon from '@material-ui/icons/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';

import {makeStyles} from '@material-ui/core/styles';

import {useDispatch} from "react-redux";
import {useHistory} from 'react-router-dom';

import {signout} from "../reducers/user.js";

const useStyles = makeStyles((theme) => ({
	root: {
		flexGrow: 1,
	},
	menuButton: {
		marginRight: theme.spacing(2),
	},
	title: {
		flexGrow: 1,
	},
}));

export default props => {
	const classes = useStyles();
	const dispatch = useDispatch();
	const history = useHistory();

	const [auth] = React.useState(true); // 1: setAuth
	const [anchorEl, setAnchorEl] = React.useState(null);
	const open = Boolean(anchorEl);

	const handleMenu = (event) => {
		setAnchorEl(event.currentTarget);
	};

	const handleClose = (event) => {
		setAnchorEl(null);
	};

	const gotoPage = (page) => {
		setAnchorEl(null);
		if (page === '/signin') {
			dispatch(signout());
		}
		history.push(page);
	};

	return (
		<div className={classes.root}>
			<AppBar position="static">
				<Toolbar>
					<IconButton edge="start" className={classes.menuButton} color="inherit" aria-label="menu">
						<MenuIcon />
					</IconButton>
					<Typography variant="h6" className={classes.title}>
						{props.title}
					</Typography>
					{auth && (
						<div>
							<IconButton
								aria-label="account of current user"
								aria-controls="menu-appbar"
								aria-haspopup="true"
								onClick={handleMenu}
								color="inherit"
							>
								<AccountCircle />
							</IconButton>
							<Menu
								id="menu-appbar"
								anchorEl={anchorEl}
								anchorOrigin={{
									vertical: 'top',
									horizontal: 'right',
								}}
								keepMounted
								transformOrigin={{
									vertical: 'top',
									horizontal: 'right',
								}}
								open={open}
								onClose={handleClose}
							>
								<MenuItem onClick={() => gotoPage("/dnsrecords")}>DNS Records</MenuItem>
								<MenuItem onClick={() => gotoPage("/dnszones")}>DNS Zones</MenuItem>
								<MenuItem onClick={() => gotoPage("/domains")}>Domains</MenuItem>
								<MenuItem onClick={() => gotoPage("/integrations")}>Integrations</MenuItem>
								<MenuItem onClick={() => gotoPage("/organizations")}>Organizations</MenuItem>
								<MenuItem onClick={() => gotoPage("/plans")}>Plans</MenuItem>
								<MenuItem onClick={() => gotoPage("/platforms")}>Platforms</MenuItem>
								<Divider />
								<MenuItem onClick={() => gotoPage("/signin")}>Logout</MenuItem>
							</Menu>
						</div>
					)}
				</Toolbar>
			</AppBar>
		</div>
	);
}
