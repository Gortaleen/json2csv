import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "fs";

function addCsvRow(objIn) {
    const jsonObj = objIn.jsonObj;
    const haploCsvPath = objIn.haploCsvPath;
    const child = objIn.child;
    const csvDelim = String.fromCharCode(44);
    const dblQuote = String.fromCharCode(34);

    appendFileSync(
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

    if (!jsonObj.allNodes[child].children) {
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
        appendFileSync(
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

function processRoot(jsonObj, childNodes, rootName) {
    const csvDelim = String.fromCharCode(44);
    const rootPath = "output\\" + rootName + "\\";
    let haploName = "";
    let haploCsvPath = "";

    if (!existsSync(rootPath)) {
        mkdirSync(rootPath);
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

            appendFileSync(
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
    const jsonTxt = readFileSync(jsonPath);
    const jsonObj = JSON.parse(jsonTxt);
    const rootsCsvPath = "output/roots.csv";
    const csvDelim = String.fromCharCode(44);
    const dblQuote = String.fromCharCode(34);

    if (existsSync("output")) {
        rmSync("output", { recursive: true, force: true });
    }

    mkdirSync("output");

    appendFileSync(
        rootsCsvPath,
        "tMRCA(BCE/CE)" + csvDelim
        + "kits" + csvDelim
        + "surnames" + csvDelim
        + "variants" + csvDelim
        + "cumulative variants" + csvDelim
        + "tree" + "\n"
    );

    Object.keys(jsonObj.roots).forEach((root, idx) => {

        // skip redundant entry
        if (idx === 0) { return; }

        appendFileSync(
            rootsCsvPath,
            // tMRCA(BCE/CE)
            "N/A" + csvDelim
            // kits
            + jsonObj.roots[root].subBranches + csvDelim
            // root
            + "N/A" + csvDelim
            // variants
            + dblQuote + jsonObj.roots[root].variants.reduce(
                (prev, cur, idx) => prev + (idx === 0 ? "" : ",") + cur.variant,
                "") + dblQuote + csvDelim
            // cumulative variants
            + jsonObj.roots[root].variants.length + csvDelim
            // tree
            + jsonObj.roots[root].name + "\n"
        );

        processRoot(jsonObj, jsonObj.roots[root].children, jsonObj.roots[root].name);
    });

    console.log("done");
}

processJSON();
