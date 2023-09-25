/*jslint white*/
"use strict";

import {
    appendFileSync, existsSync, mkdirSync, readFileSync, rmSync
} from "fs";

function addCvsHeader(haploCsvPath) {
    const csvDelim = String.fromCharCode(44);

    appendFileSync(
        haploCsvPath,
        "tMRCA(BCE/CE)" + csvDelim
        + "Kits" + csvDelim
        + "Surnames" + csvDelim
        + "Variants" + csvDelim
        + "Cumulative Variants" + csvDelim
        + "Tree" + csvDelim
        + "Big Y count" + "\n"
    );

}

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
                (prev, cur, idx) => prev
                    + (idx === 0 ? "" : csvDelim)
                    + cur?.surname,
                "") + dblQuote + csvDelim
        // variants
        + dblQuote + jsonObj.allNodes[child].variants.reduce(
            (prev, cur, idx) => prev + (idx === 0 ? "" : ",") + cur.variant,
            "") + dblQuote + csvDelim
        // cumulative variants
        + jsonObj.allNodes[child].variants.length + csvDelim
        // tree
        + jsonObj.allNodes[child].name + csvDelim
        // Big Y count
        + jsonObj.allNodes[child].bigYCount + "\n"
    );
}

function processChild(objIn) {
    const jsonObj = objIn.jsonObj;
    const haploCsvPath = objIn.haploCsvPath;
    const child = objIn.child;

    addCsvRow({ child, haploCsvPath, jsonObj });

    if (!jsonObj.allNodes[child].children) {
        return;
    }

    jsonObj.allNodes[child]?.children
        // .filter((ch1) => typeof ch1 === "number")
        .forEach(function (ch2) {
            processChild({ child: ch2, haploCsvPath, jsonObj });
        });
}

function processSubBranches(objIn) {
    const jsonObj = objIn.jsonObj;
    const parent = objIn.parent;
    const rootPath = objIn.rootPath;

    const haploName = parent.name;
    const haploCsvPath = rootPath + haploName + ".csv";

    if (parent?.subBranches <= 1000) {
        // print to file
        addCvsHeader(haploCsvPath);
        addCsvRow({ child: parent.haplogroupId, haploCsvPath, jsonObj });
        parent.children
            ?.filter((val) => val)
            .forEach(function (child) {
                processChild(
                    {
                        child,
                        haploCsvPath,
                        jsonObj
                    }
                );
            });
    } else if (parent.subBranches > 1000) {
        parent.children.forEach(function (child) {
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
    const rootPath = "output\\" + rootName + "\\";
    let haploName = "";
    let haploCsvPath = "";

    if (!existsSync(rootPath)) {
        mkdirSync(rootPath);
    }

    childNodes.forEach(function (node) {

        if (jsonObj.allNodes[node].subBranches > 1000) {
            // for each node with > 1000 subbranches
            // 1. recurse through descendants for each subbranch
            //    when a descendant has <= 1000 subranches
            //    print its children to a csv named for the root + current
            //    branch name.
            processSubBranches(
                {
                    jsonObj,
                    parent: jsonObj.allNodes[node],
                    rootPath
                }
            );
        } else {
            // for each child of a root with <= 1000 subbranches
            // print its children to a csv named for the root + current branch
            // name.
            haploName = jsonObj.allNodes[node].name;
            haploCsvPath = rootPath + haploName + ".csv";
            addCvsHeader(haploCsvPath);
            jsonObj.allNodes[node].children
                ?.filter((val) => val)
                .forEach(function (child) {
                    processChild(
                        {
                            child,
                            haploCsvPath,
                            jsonObj
                        }
                    );
                });
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
        rmSync("output", { force: true, recursive: true });
    }

    mkdirSync("output");
    addCvsHeader(rootsCsvPath);
    Object.keys(jsonObj.roots).forEach(function (root, idx) {

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
            + jsonObj.roots[root].name + csvDelim
            // Big Y count
            + jsonObj.roots[root].bigYCount + "\n"
        );

        processRoot(
            jsonObj,
            jsonObj.roots[root].children,
            jsonObj.roots[root].name
        );
    });

    console.log("done");
}

processJSON();
