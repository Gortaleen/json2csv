// const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");

function addCsvRow(objIn) {
    const jsonObj = objIn.jsonObj;
    const haploCsvPath = objIn.haploCsvPath;
    const child = objIn.child;
    const csvDelim = String.fromCharCode(44);
    const dblQuote = String.fromCharCode(34);

    fs.appendFileSync(
        haploCsvPath,
        // tMRCA(BCE/CE)
        "N/A" + csvDelim
        // kits
        + (jsonObj.allNodes[child].kitsCount || 0) + csvDelim
        // surnames
        + dblQuote + jsonObj.allNodes[child]?.surnames
            ?.reduce(
                (prev, cur, idx) => prev + (idx === 0 ? "" : csvDelim) + cur?.surname,
                "") + dblQuote + csvDelim
        // variants
        + dblQuote + jsonObj.allNodes[child].variants.reduce(
            (prev, cur, idx) => prev + (idx === 0 ? "" : ",") + cur.variant,
            "") + dblQuote + csvDelim
        // cumulative variants
        + jsonObj.allNodes[child].variants.length + csvDelim
        // tree
        + jsonObj.allNodes[child].name + "\n"
    );
}

function processChild(objIn) {
    const jsonObj = objIn.jsonObj;
    const haploCsvPath = objIn.haploCsvPath;
    const child = objIn.child;

    if (jsonObj.allNodes[child]?.children === undefined) {
        return;
    } else {
        jsonObj.allNodes[child]?.children
            .filter(child => typeof child === "number")
            .forEach(child => {
                processChild({ jsonObj, haploCsvPath, child });
                addCsvRow({ jsonObj, haploCsvPath, child });
            });
    }
}

function processSubBranches(objIn) {
    const jsonObj = objIn.jsonObj;
    const parent = objIn.parent;
    const rootPath = objIn.rootPath;

    const haploName = parent.name;
    const haploCsvPath = rootPath + haploName + ".csv";
    const csvDelim = String.fromCharCode(44);

    if (parent?.subBranches <= 1000) {
        // print to file
        fs.appendFileSync(
            haploCsvPath,
            "tMRCA(BCE/CE)" + csvDelim
            + "kits" + csvDelim
            + "names" + csvDelim
            + "variants" + csvDelim
            + "cumulative variants" + csvDelim
            + "tree" + "\n"
        );
        addCsvRow({ jsonObj, haploCsvPath, child: parent.haplogroupId });
        parent.children
            ?.filter((val) => val)
            .forEach((child) => processChild(
                {
                    jsonObj,
                    haploCsvPath,
                    child
                }
            ));
    } else if (parent.subBranches > 1000) {
        parent.children.forEach(child => {
            processSubBranches(
                {
                    jsonObj,
                    "parent": jsonObj.allNodes[child],
                    rootPath
                }
            );
        });
    }

    return;
}

function processRoots(jsonObj, childNodes, rootName) {
    const csvDelim = String.fromCharCode(44);
    const rootPath = "output\\" + rootName + "\\";
    let haploName = "";
    let haploCsvPath = "";

    if (!fs.existsSync(rootPath)) {
        fs.mkdirSync(rootPath);
    }

    childNodes.forEach((node) => {

        if (jsonObj.allNodes[node].subBranches > 1000) {
            // for each node with > 1000 subbranches
            // 1. recurse through descendants for each subbranch
            //    when a descendant has <= 1000 subranches
            //    print its children to a csv named for the root + current branch name
            processSubBranches({ jsonObj, parent: jsonObj.allNodes[node], rootPath });
        } else {
            // for each child of a root with <= 1000 subbranches
            // print its children to a csv named for the root + current branch name
            haploName = jsonObj.allNodes[node].name;
            haploCsvPath = rootPath + haploName + ".csv";

            fs.appendFileSync(
                haploCsvPath,
                "tMRCA(BCE/CE)" + csvDelim
                + "kits" + csvDelim
                + "names" + csvDelim
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
    }

    fs.mkdirSync("output");

    fs.appendFileSync(
        rootsCsvPath,
        "tMRCA(BCE/CE)" + csvDelim
        + "kits" + csvDelim
        + "surnames" + csvDelim
        + "variants" + csvDelim
        + "cumulative variants" + csvDelim
        + "tree" + "\n"
    );

    Object.keys(jsonObj.roots).forEach((key, idx) => {

        // skip redundant entry
        if (idx === 0) { return; }

        fs.appendFileSync(
            rootsCsvPath,
            // tMRCA(BCE/CE)
            "N/A" + csvDelim
            // kits
            + jsonObj.roots[key].subBranches + csvDelim
            // root
            + "N/A" + csvDelim
            // variants
            + dblQuote + jsonObj.roots[key].variants.reduce(
                (prev, cur, idx) => prev + (idx === 0 ? "" : ",") + cur.variant,
                "") + dblQuote + csvDelim
            // cumulative variants
            + jsonObj.roots[key].variants.length + csvDelim
            // tree
            + jsonObj.roots[key].name + "\n"
        );

        processRoots(jsonObj, jsonObj.roots[key].children, jsonObj.roots[key].name);
    });

    console.log("done");
}

processJSON();
