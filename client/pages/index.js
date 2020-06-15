import React, { Component, Fragment } from "react";
import { toast } from "react-toastify";
import Head from "next/head";
import io from "socket.io-client";
import config from "../config";
import { set } from "lodash";

export default class Index extends Component {
    constructor(props) {
        super(props);
        this.toSendDefault = { quantity: 0, material: "iron" };
        this.state = {
            viewModal: false,
            modalData: {},
            toSend: this.toSendDefault,
            sendEnabled: true,
        };
        this.socket = false;
        this.map = null;
        this.L = null;
        this.icons = {};
        this.onChangeValue = this.onChange.bind(this);
    }

    componentDidMount() {
        this.L = require("leaflet");
        this.initMap();
    }

    initConnection() {
        this.socket = io("http://localhost:3001");
        this.socket.on("recieve-data", (data) => {
            this.generateVillages(data);
        });
        this.socket.on("village-selected", (data) => {
            if (data) {
                this.setState({
                    modalData: data,
                    viewModal: true,
                    toSend: {
                        quantity: 0,
                        material: this.state.toSend.material,
                    },
                    sendEnabled: true,
                });
            }
        });
        this.socket.on("notification", (data) => {
            if (data) {
                if (data.sendEnabled) {
                    this.setState({ sendEnabled: data.sendEnabled });
                }
                const { message } = data;
                if (!message) return;
                switch (data.type) {
                    case "success":
                        return toast.success(message);
                    case "error":
                        return toast.error(message);
                    default:
                        return toast.info(message);
                }
            }
        });
    }

    generateVillages(data) {
        if (data && typeof data == "object") {
            for (const user in data) {
                if (data.hasOwnProperty(user)) {
                    const userData = data[user];
                    const iconName = config.village_levels[userData.level];
                    const villageMarker = this.icons[iconName];
                    this.L.marker(userData.coords, { icon: villageMarker })
                        .addTo(this.map)
                        /* .bindPopup(`User: ${user}`) */
                        .on("click", (e) => this.villageClick(e, user));
                }
            }
        }
    }

    villageClick(e, user) {
        this.socket.emit("village-selected", user);
    }

    initMap() {
        this.map = L.map("map", {
            center: [-106.5, 162.71875],
            zoom: 5,
            maxZoom: 7,
            minZoom: 1,
            crs: this.L.CRS.Simple,
        });

        this.map.on("click", (e) => {
            console.log("Lat, Lon : " + e.latlng.lat + ", " + e.latlng.lng);
        });

        this.setMapBackground();
        this.createMarkers();
        this.initConnection();
    }

    setMapBackground() {
        const imageUrl = "/assets/map.svg";
        const height = 40000;
        const width = 40000;

        const southWest = this.map.unproject(
            [0, height],
            this.map.getMaxZoom() - 1
        );
        const northEast = this.map.unproject(
            [width, 0],
            this.map.getMaxZoom() - 1
        );
        const bounds = new this.L.LatLngBounds(southWest, northEast);
        this.L.imageOverlay(imageUrl, bounds).addTo(this.map);
        this.map.setMaxBounds(bounds);
    }

    createMarkers() {
        if (config.icons) {
            const icons = config.icons;
            for (const iconName in icons) {
                if (icons.hasOwnProperty(iconName)) {
                    const data = icons[iconName];
                    const size = [data.width / 5, data.height / 5];
                    const iconData = this.L.Icon.extend({
                        options: {
                            iconSize: size,
                            iconAnchor: size,
                            popupAnchor: [-20, -50],
                            className: "village-icon",
                        },
                    });
                    this.icons[iconName] = new iconData({
                        iconUrl: `/assets/${data.filename}`,
                    });
                }
            }
        }
    }

    closeModal() {
        this.setState({
            modalData: {},
            viewModal: false,
            toSend: this.toSendDefault,
        });
    }

    onChange(e) {
        let data = this.state;
        const { name, value } = e.target;
        data = set(data, name, value);
        this.setState(data);
    }

    sendResources() {
        const { toSend, sendEnabled } = this.state;
        if (!sendEnabled) return;
        this.setState(
            {
                toSend: this.toSendDefault,
                sendEnabled: false,
            },
            () => {
                this.socket.emit("send-resources", toSend);
            }
        );
    }

    render() {
        const { viewModal, modalData, toSend, sendEnabled } = this.state;
        return (
            <Fragment>
                <Head>
                    <title>MMORTS</title>
                    <link
                        rel="stylesheet"
                        href="https://unpkg.com/leaflet@1.6.0/dist/leaflet.css"
                        integrity="sha512-xwE/Az9zrjBIphAcBb3F6JVqxf46+CDLwfLMHloNu6KEQCAWi6HcDUbeOfBIptF7tcCzusKFjFw2yuvEpDL9wQ=="
                        crossorigin=""
                    />
                </Head>
                {viewModal ? (
                    <div className="resources-modal">
                        Recursos de la aldea
                        <ul>
                            <li>
                                <img src="/assets/iron.png"></img>{" "}
                                {modalData.selected.iron || 0}
                            </li>
                            <li>
                                <img src="/assets/wood.png"></img>
                                {modalData.selected.wood || 0}
                            </li>
                        </ul>
                        Mis Recursos
                        <ul>
                            <li>
                                <img src="/assets/iron.png"></img>{" "}
                                {modalData.me.iron || 0}
                            </li>
                            <li>
                                <img src="/assets/wood.png"></img>
                                {modalData.me.wood || 0}
                            </li>
                        </ul>
                        <button
                            className="close"
                            onClick={this.closeModal.bind(this)}
                        >
                            X
                        </button>
                        <div>
                            Enviar recurso:
                            <select
                                name="toSend.material"
                                onChange={this.onChangeValue}
                            >
                                <option value="iron">Hierro</option>
                                <option value="wood">Madera</option>
                            </select>
                            {toSend.material ? (
                                <input
                                    type="range"
                                    min={0}
                                    max={modalData.me[toSend.material] || 0}
                                    name="toSend.quantity"
                                    onChange={this.onChangeValue}
                                ></input>
                            ) : null}
                            <button
                                onClick={this.sendResources.bind(this)}
                                disabled={!sendEnabled}
                            >
                                Enviar
                            </button>
                        </div>
                    </div>
                ) : null}
                <div id="map"></div>
            </Fragment>
        );
    }
}
