import React from "react";
import Header from "../../components/Header";
import TileView from "./TileView";

class New extends React.PureComponent {

	render() {
		return (
			<div>
				<Header title="Plans" />
				<TileView />
			</div>
		);
	}

}

export default New;
