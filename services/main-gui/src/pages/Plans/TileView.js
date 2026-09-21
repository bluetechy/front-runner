import React, {useEffect, useState} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import GridList from '@material-ui/core/GridList';
import GridListTile from '@material-ui/core/GridListTile';

const useStyles = makeStyles((theme) => ({
	root: {
		display: 'flex',
		flexWrap: 'wrap',
		justifyContent: 'space-around',
		overflow: 'hidden',
		backgroundColor: theme.palette.background.paper,
	},
	gridList: {
		width: 500,
		height: 450,
	},
}));

export default function ImageGridList() {
	const classes = useStyles();

	const [, setErrors] = useState(false); // 0: hasError
	const [records, setRecords] = useState([]);

	async function loadData() {
		fetch("http://localhost:30000/v1/plans")
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
		<div className={classes.root}>
			<GridList cellHeight={160} className={classes.gridList} cols={3}>
				{records.map((record) => (
					<GridListTile key={record.id} cols={1}>
						<div>
							<p>{record.name}</p>
							<p>{record.price}</p>
							<p>{record.currency}</p>
							<p>{record.frequency}</p>
						</div>
					</GridListTile>
				))}
			</GridList>
		</div>
	);
}