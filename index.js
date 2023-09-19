const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");

function processChild(ObjIn) {
    const jsonObj = ObjIn.jsonObj;
    const haploCsvPath = ObjIn.haploCsvPath;
    const child = ObjIn.child;
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

function processChildren(jsonObj, childNodes) {
    const csvDelim = String.fromCharCode(44);
    const dblQuote = String.fromCharCode(34);
    let haploName = "";
    let haploCsvPath = "";

    childNodes.forEach((node) => {

        if (jsonObj.allNodes[node].subBranches > 1000) {
            // recurse
        } else {
            haploName = jsonObj.allNodes[node].name;
            haploCsvPath = "output/" + haploName + ".csv";

            if (fs.existsSync(haploCsvPath)) {
                fs.unlinkSync(haploCsvPath);
            }

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

    if (fs.existsSync(rootsCsvPath)) {
        fs.unlinkSync(rootsCsvPath);
    }

    fs.appendFileSync(
        rootsCsvPath,
        "tMRCA(BCE/CE)" + csvDelim
        + "kits" + csvDelim
        + "root" + csvDelim
        + "variants" + csvDelim
        + "cumulative variants" + csvDelim
        + "tree" + "\n"
    );

    Object.keys(jsonObj.roots).forEach((key) => {
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
        processChildren(jsonObj, jsonObj.roots[key].children);
    });

    console.log("done");
}

processJSON();
