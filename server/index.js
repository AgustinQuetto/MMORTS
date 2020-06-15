const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const get = require("lodash").get;

let users = 0;
const materials = ["wood", "iron"];
const translations = { wood: "madera", iron: "hierro" };
const villages = {
    user1: {
        level: 1,
        coords: [-102.5, 165.8125],
        resources: {
            wood: 2000,
            iron: 3000,
        },
    },
    user2: {
        level: 2,
        coords: [-111.84375, 160.21875],
        resources: {
            wood: 4000,
            iron: 1000,
        },
    },
};

const resourcesDefault = { wood: 0, iron: 0 };

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

io.on("connection", (socket) => {
    if (!villages[`user${users + 1}`]) {
        socket.disconnect();
        return;
    }
    users++;
    const currentUser = `user${users}`;
    let currentUserSelected = "";
    console.log("a user connected");
    socket.emit("recieve-data", villages);
    socket.on("village-selected", (id) => {
        if (id && villages[id]) {
            const resources = getResourcesFromSelected(id);
            socket.emit("village-selected", resources);
        }
    });

    socket.on("send-resources", (data) => {
        if (!data) return;
        let { quantity, material } = data;
        quantity = parseInt(quantity || 0);
        if (quantity < 1) {
            socket.emit("notification", {
                type: "error",
                message: `Debes seleccionar un monto a enviar.`,
                sendEnabled: true,
            });
            return;
        }
        if (!material || !materials.includes(material)) {
            socket.emit("notification", {
                type: "error",
                message: `Debes seleccionar un material.`,
                sendEnabled: true,
            });
            return;
        }

        if (
            !villages ||
            !villages[currentUser] ||
            !villages[currentUserSelected]
        )
            return;
        if (!villages[currentUser].resources) {
            villages[currentUser].resources = {};
        }
        if (!villages[currentUserSelected].resources) {
            villages[currentUserSelected].resources = {};
        }
        const meResourcePath = `${currentUser}.resources.${material}`;
        const toResourcePath = `${currentUserSelected}.resources.${material}`;
        const fromQuantity = get(villages, meResourcePath, 0);
        const toQuantity = get(villages, toResourcePath, 0);
        if (!fromQuantity || fromQuantity < quantity) {
            socket.emit("notification", {
                type: "error",
                message: `No posee los recursos necesarios a enviar.`,
            });
            return;
        }
        const newToQuantity = toQuantity + quantity;
        const newFromQuantity = fromQuantity - quantity;
        villages[currentUserSelected].resources[material] = newToQuantity;
        villages[currentUser].resources[material] = newFromQuantity;
        socket.emit("notification", {
            type: "success",
            message: `Se ha enviado ${quantity} de ${translations[material]} a ${currentUserSelected}`,
        });
        socket.emit(
            "village-selected",
            getResourcesFromSelected(currentUserSelected)
        );
    });
    socket.on("disconnect", () => {
        users--;
        console.log("User disconnected " + currentUser);
    });

    function getResourcesFromSelected(id) {
        const data = villages[id];
        const me = {
            ...resourcesDefault,
            ...(villages[currentUser].resources || {}),
        };
        const selected = { ...resourcesDefault, ...(data.resources || {}) };
        const resources = {
            me,
            selected,
        };
        currentUserSelected = id;
        return resources;
    }
});

http.listen(3001, () => {
    console.log("listening on *:3000");
});
