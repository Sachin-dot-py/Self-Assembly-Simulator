import React, { Component } from 'react';

class Footer extends Component {

    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div className="footer">
                <img src={"/static/ucsdlogo.png"} className="maxWidth" alt="footer" />
            </div>
        );
    }
}

export default Footer;