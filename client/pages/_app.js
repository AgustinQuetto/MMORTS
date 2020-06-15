import { Fragment } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../styles.scss";

function MyApp({ Component, pageProps }) {
    return (
        <Fragment>
            <Component {...pageProps} />
            <ToastContainer />
        </Fragment>
    );
}

export default MyApp;
