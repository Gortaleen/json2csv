// const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");

function processChild(objIn) {
    const jsonObj = objIn.jsonObj;
    const haploCsvPath = objIn.haploCsvPath;
    const child = objIn.child;
    const csvDelim = String.fromCharCode(44);
    const dblQuote = String.fromCharCode(34);

    if (jsonObj.allNodes[child].children === undefined) {
        return;
    } else {
        jsonObj.allNodes[child].children
            .filter(child => typeof child === "number")
            .forEach(child => {
                processChild({ jsonObj, haploCsvPath, child });

                fs.appendFileSync(
                    haploCsvPath,
                    "N/A" + csvDelim
                    + "N/A" + csvDelim
                    + "N/A" + csvDelim
                    + dblQuote
                    + jsonObj.allNodes[child].variants.reduce(
                        (prev, cur, idx) => prev + (idx === 0 ? "" : ",") + cur.variant,
                        "")
                    + dblQuote + csvDelim
                    + "N/A" + csvDelim
                    + jsonObj.allNodes[child].name + "\n"
                );
            });
    }
}

function processSubBranches(objIn) {
    const jsonObj = objIn.jsonObj;
    const parent = objIn.parent;
    const path = objIn.path;
    const csvDelim = String.fromCharCode(44);
    const dblQuote = String.fromCharCode(34);

    if (parent?.subBranches > 1000) {
        parent.children.forEach(child => {
            processSubBranches(
                {
                    jsonObj,
                    "parent": jsonObj.allNodes[child],
                    "path": path + "\\" + parent.name + "\\" + jsonObj.allNodes[child].name
                });
        });
    } else {

        if (!fs.existsSync(path)) {
            fs.mkdirSync(path, { recursive: true });
        }

        fs.appendFileSync(
            path + "\\" + parent.name + ".csv",
            "tMRCA(BCE/CE)" + csvDelim
            + "kits" + csvDelim
            + "root" + csvDelim
            + "variants" + csvDelim
            + "cumulative variants" + csvDelim
            + "tree" + "\n"
        );

        parent.children
            ?.filter(child => String(child).match(/\d+/))
            .forEach(child => {
                fs.appendFileSync(
                    path + "\\" + parent.name + ".csv",
                    "N/A" + csvDelim
                    + jsonObj.allNodes[child].subBranches + csvDelim
                    + "N/A" + csvDelim
                    + dblQuote
                    + jsonObj.allNodes[child].variants.reduce(
                        (prev, cur, idx) => prev + (idx === 0 ? "" : ",") + cur.variant,
                        "")
                    + dblQuote + csvDelim
                    + "N/A" + csvDelim
                    + jsonObj.allNodes[child].name + "\n"
                );
            });

        return;
    }
}

function processChildren(jsonObj, childNodes, parentName) {
    const csvDelim = String.fromCharCode(44);
    let haploName = "";
    let haploCsvPath = "";

    if (!fs.existsSync("output\\" + parentName)) {
        fs.mkdirSync("output\\" + parentName);
    }

    childNodes.forEach((node) => {

        if (jsonObj.allNodes[node].subBranches > 1000) {
            // recurse
            processSubBranches(
                {
                    jsonObj,
                    parent: jsonObj.allNodes[node],
                    path: "output\\" + parentName + "\\" + jsonObj.allNodes[node].name
                }
            );
        } else {
            haploName = jsonObj.allNodes[node].name;
            haploCsvPath = "output\\" + parentName + "\\" + haploName + ".csv";

            // if (fs.existsSync(haploCsvPath)) {
            //     fs.unlinkSync(haploCsvPath);
            // }

            fs.appendFileSync(
                haploCsvPath,
                "tMRCA(BCE/CE)" + csvDelim
                + "kits" + csvDelim
                + "root" + csvDelim
                + "variants" + csvDelim
                + "cumulative variants" + csvDelim
                + "tree" + "\n"
            );

            jsonObj.allNodes[node].children
                ?.filter((val) => val)
                .forEach((child) => processChild(
                    {
                        jsonObj,
                        haploCsvPath,
                        child
                    }
                ));
        }
    });
}

function processJSON() {
    const jsonPath = "input/y-dna-haplotree.json";
    const jsonTxt = fs.readFileSync(jsonPath);
    const jsonObj = JSON.parse(jsonTxt);
    const rootsCsvPath = "output/roots.csv";
    const csvDelim = String.fromCharCode(44);
    const dblQuote = String.fromCharCode(34);

    if (fs.existsSync("output")) {
        fs.rmSync("output", { recursive: true, force: true });
        fs.mkdirSync("output");
    }

    // if (!fs.existsSync("output")) {
    //     fs.mkdirSync("output");
    // }

    // if (fs.existsSync(rootsCsvPath)) {
    //     fs.unlinkSync(rootsCsvPath);
    // }

    fs.appendFileSync(
        rootsCsvPath,
        "tMRCA(BCE/CE)" + csvDelim
        + "kits" + csvDelim
        + "root" + csvDelim
        + "variants" + csvDelim
        + "cumulative variants" + csvDelim
        + "tree" + "\n"
    );

    Object.keys(jsonObj.roots).forEach((key, idx) => {
        if (idx === 0) { return; } // skip redundant entry
        fs.appendFileSync(
            rootsCsvPath,
            "N/A" + csvDelim
            + jsonObj.roots[key].subBranches + csvDelim
            + "N/A" + csvDelim
            + dblQuote
            + jsonObj.roots[key].variants.reduce(
                (prev, cur, idx) => prev + (idx === 0 ? "" : ",") + cur.variant,
                "")
            + dblQuote + csvDelim
            + "N/A" + csvDelim
            + jsonObj.roots[key].name + "\n"
        );
        processChildren(jsonObj, jsonObj.roots[key].children, jsonObj.roots[key].name);
    });

    console.log("done");
}

processJSON();
