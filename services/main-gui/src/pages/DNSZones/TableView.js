import React, {useEffect, useState} from 'react';
import { withStyles, makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';

const StyledTableCell = withStyles((theme) => ({
	head: {
		backgroundColor: theme.palette.common.black,
		color: theme.palette.common.white,
	},
	body: {
		fontSize: 14,
	},
}))(TableCell);

const StyledTableRow = withStyles((theme) => ({
	root: {
		'&:nth-of-type(odd)': {
			backgroundColor: theme.palette.action.hover,
		},
	},
}))(TableRow);

const useStyles = makeStyles({
	table: {
		minWidth: 700,
	},
});

export default function CustomizedTables() {
	const classes = useStyles();

	const [, setErrors] = useState(false); // 0: hasError
	const [records, setRecords] = useState([]);

	async function loadData() {
		fetch("http://localhost:30000/v1/dnszones")
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
			<Table className={classes.table} aria-label="customized table">
				<TableHead>
					<TableRow>
						<StyledTableCell>Domain Name</StyledTableCell>
						<StyledTableCell align="right">Platform</StyledTableCell>
						<StyledTableCell align="right">Expires</StyledTableCell>
						<StyledTableCell align="right">Auto Renewal Status</StyledTableCell>
						<StyledTableCell align="right">Registration Status</StyledTableCell>
						<StyledTableCell align="right">New Domain</StyledTableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{records.map((record) =>
						<StyledTableRow key={record.id}>
							<StyledTableCell component="th" scope="row"><a href={record.href}>{record.name}</a></StyledTableCell>
							<StyledTableCell align="right">Registrar</StyledTableCell>
							<StyledTableCell align="right">2021-12-31</StyledTableCell>
							<StyledTableCell align="right">Yes</StyledTableCell>
							<StyledTableCell align="right">Registered</StyledTableCell>
							<StyledTableCell align="right">Delete</StyledTableCell>
						</StyledTableRow>
					)}
				</TableBody>
			</Table>
		</TableContainer>
	);
}
