import React, {useEffect, useState} from 'react';
//import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import Collapse from '@material-ui/core/Collapse';
import IconButton from '@material-ui/core/IconButton';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
//import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import Button from "@material-ui/core/Button";
import InviteDialog from "../Organizations/InviteDialog";

const useStyles = makeStyles((theme) => ({
	margin: {
		margin: theme.spacing(-1),
	},
}));

const useRowStyles = makeStyles({
	root: {
		'& > *': {
			borderBottom: 'unset',
		},
	},
});

function Row(props) {
	const { row } = props;
	const [open, setOpen] = React.useState(false);
	const classes = useRowStyles();

	return (
		<React.Fragment>
			<TableRow className={classes.root}>
				<TableCell>
					<IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
						{open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
					</IconButton>
				</TableCell>
				<TableCell component="th" scope="row">{row.name}</TableCell>
				<TableCell align="right">{row.plan.name}</TableCell>
				<TableCell align="right"><InviteDialog /> | Leave | Delete</TableCell>
			</TableRow>
			<TableRow>
				<TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
					<Collapse in={open} timeout="auto" unmountOnExit>
						<Box margin={1}>
							<Table size="small" aria-label="purchases">
								<TableHead>
									<TableRow>
										<TableCell>Integrations</TableCell>
										<TableCell>Members</TableCell>
										<TableCell>Owner</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									<TableRow>
										<TableCell component="th" scope="row">{row.total_integrations}</TableCell>
										<TableCell>{row.total_members}</TableCell>
										<TableCell>{row.owner.name}</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						</Box>
					</Collapse>
				</TableCell>
			</TableRow>
		</React.Fragment>
	);
}
/*
Row.propTypes = {
	row: PropTypes.shape({
		calories: PropTypes.number.isRequired,
		carbs: PropTypes.number.isRequired,
		fat: PropTypes.number.isRequired,
		history: PropTypes.arrayOf(
			PropTypes.shape({
				amount: PropTypes.number.isRequired,
				customerId: PropTypes.string.isRequired,
				date: PropTypes.string.isRequired,
			}),
		).isRequired,
		name: PropTypes.string.isRequired,
		price: PropTypes.number.isRequired,
		protein: PropTypes.number.isRequired,
	}).isRequired,
};
*/
export default props => {
	const classes = useStyles();

	const [, setErrors] = useState(false); // 0: hasError
	const [records, setRecords] = useState([]);

	async function loadData() {
		fetch("http://localhost:30000/v1/organizations")
			.then(async result => {
				if (result.ok) {
					const data = await result.json();
					setRecords(data);
				}
			})
			.catch(error => setErrors(error));
	}

	useEffect(() => {
		loadData();
	}, []);

	return (
		<TableContainer component={Paper}>
			<Table aria-label="collapsible table">
				<TableHead>
					<TableRow>
						<TableCell />
						<TableCell>Organization Name</TableCell>
						<TableCell>Plan</TableCell>
						<TableCell align="right">
							<Button size="small" variant="contained" className={classes.margin}>New Orgranization</Button>
						</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{records.map((record) => (
						<Row key={record.id} row={record} />
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
}