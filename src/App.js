import React, { Component, Fragment } from 'react';
import 'semantic-ui-css/semantic.min.css';
//import ViewerConf from "./apps/ViewerConf";
import ClientConf from "./apps/ClientConf";
import './App.css';

class App extends Component {

    render() {
        return (
            <Fragment>
                {/*<ViewerConf/>*/}
                <ClientConf/>
            </Fragment>
        );
    }
}

export default App;