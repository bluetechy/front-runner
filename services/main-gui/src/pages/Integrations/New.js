import React from "react";
import Header from "../../components/Header";

class New extends React.PureComponent {

	constructor(props) {
		super(props);

		this.state = {
			hits: [],
			isLoading: false,
			error: null,
		};
	}

	componentDidMount() {
		this.setState({isLoading: true});
		fetch("http://localhost:30000/v1/integrations")
			.then(response => response.json())
			.then(hits => this.setState({hits, isLoading: false}))
			.catch(error => this.setState({error, isLoading: false}));
	}

	render() {
		const {hits, isLoading, error} = this.state;

		if (error) {
			return <p>{error.message}</p>;
		}

		if (isLoading) {
			return <p>Loading ...</p>;
		}

		return (
			<div>
				<Header title="Integrations" />
				<ul>
					{hits.map(hit =>
						<li key={hit.id}>
							<a href={hit.href}>{hit.name}</a>
						</li>
					)}
				</ul>
			</div>
		);
	}

}

export default New;
