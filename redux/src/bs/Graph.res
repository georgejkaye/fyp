open Lambda
open Helpers

let lambda = `λ`

type nodedata = {"id": string, "label": string}

type pos = {"x": int, "y": int}

type node = {"data": nodedata, "classes": array<string>, "pos": pos}

type edgedata = {"id": string, "source": string, "target": string, "label": string}

type nodeType =
  ABS | ABS_MP | ABS_SP_MP | ABS_SP | ABS_TOP | APP | APP_MP | VAR | VAR_MP | VAR_TOP | FREE | ROOT

let nid = (ntype, n) => {
  let prefix = switch ntype {
  | ABS => "abs"
  | APP => "app"
  | APP_MP => "app_mp"
  | ABS_SP => "abs_sp"
  | ABS_MP => "abs_mp"
  | ABS_SP_MP => "abs_sp_mp"
  | ABS_TOP => "abs_top"
  | VAR => "var"
  | VAR_MP => "var_mp"
  | VAR_TOP => "var_top"
  | FREE => "free"
  | ROOT => ">"
  }
  prefix ++ "_" ++ str(n)
}

let eid = (n1type, n2type, n) => {
  let (n1, n2) = (nid(n1type, n), nid(n2type, n))
  n1 ++ "_to_" ++ n2 ++ "_" ++ str(n)
}

type direction = U | L | R

type edge = {"data": edgedata, "classes": array<string>}

let rec checkNodeId = (nodes, id) =>
  contains(id, List.map(x => x["data"]["id"], nodes)) ? checkNodeId(nodes, id ++ "'") : id

let createNode = (nodes, id, classes, x, y, label) =>
  {
    "data": {"id": checkNodeId(nodes, id), "label": label},
    "classes": classes,
    "pos": {"x": x, "y": y},
  }

let rec checkEdgeId = (edges, id) =>
  contains(id, List.map(x => x["data"]["id"], edges)) ? checkEdgeId(edges, id ++ "'") : id

let createEdge = (edges, id, classes, source, target, label) =>
  {
    "data": {"id": checkEdgeId(edges, id), "source": source, "target": target, "label": label},
    "classes": classes,
  }

let rec generateFreeVariableElements = (ctx, dict) =>
  generateFreeVariableElements'(ctx, dict, list{}, 0)
and generateFreeVariableElements' = (ctx, dict, nodes, n) => {
  switch ctx {
  | list{} => (list{}, dict, n)
  | list{x, ...xs} => {
      let nodeID = "free_" ++ str(n)
      let nodeLabel = lambda ++ x
      let node = createNode(nodes, nodeID, ["free"], 0, 0, nodeLabel)

      let dict = list{(n, true), ...dict}
      generateFreeVariableElements'(ctx, dict, list{node, ...nodes}, n + 1)
    }
  }
}

let nodeDistanceX = 30
let nodeDistanceY = 30

let rec generateGraphElements = (term, ctx) => {
  let (nodes, dict, n) = generateFreeVariableElements(ctx, list{})

  let (nodes, edges, _) = generateGraphElements'(
    term,
    ctx,
    dict,
    nodes,
    list{},
    {"data": {"id": ">", "label": ""}, "classes": ["root"], "pos": {x: 0, y: 0}},
    ROOT,
    U,
    list{},
    false,
    n,
  )

  (nodes, edges)
}
and generateGraphElements' = (
  term,
  ctx,
  dict,
  nodes,
  edges,
  parent,
  ptype,
  dir,
  redexes,
  redexEdge,
  n,
) => {
  Js.log("Processing " ++ prettyPrint(term, ctx))

  let posY = parent["pos"]["y"] - nodeDistanceY
  let mpPosY = parent["pos"]["y"] - nodeDistanceY / 2

  let (posX, mpPosX) = switch dir {
  | U => (parent["pos"]["x"], parent["pos"]["x"])
  | L => (parent["pos"]["x"] - nodeDistanceX, parent["pos"]["x"] - nodeDistanceX / 2)
  | R => (parent["pos"]["x"] + nodeDistanceX, parent["pos"]["x"] + nodeDistanceX / 2)
  }

  switch term {
  | Var(x, a) => {
      let x = fst(List.nth(dict, x))

      let node1 = createNode(nodes, nid(VAR_MP, x), ["midpoint"], mpPosX, mpPosY, "")
      let node2 = createNode(nodes, nid(VAR, x), ["support"], posX, posY, "")
      let node3 = createNode(nodes, nid(VAR_TOP, x), ["top"], posX, posY - nodeDistanceY, "")

      let edge1 = createEdge(
        edges,
        eid(ptype, VAR_MP, x),
        ["varedge"],
        parent["data"]["id"],
        node1["data"]["id"],
        "",
      )
      let edge2 = createEdge(
        edges,
        eid(VAR_MP, VAR, x),
        ["varedge"],
        node1["data"]["id"],
        node2["data"]["id"],
        "",
      )
      let edge3 = createEdge(
        edges,
        eid(VAR, VAR_TOP, x),
        ["varedge"],
        node2["data"]["id"],
        node3["data"]["id"],
        "",
      )

      (list{node1, node2, node3, ...nodes}, list{edge1, edge2, edge3, ...edges}, n)
    }
  | Abs(t, x, a) => {
      let node1 = createNode(nodes, nid(ABS_MP, n), ["midpoint"], mpPosX, mpPosY, "")
      let node2 = createNode(nodes, nid(ABS, n), ["abstraction"], posX, posY, lambda)
      let node3 = createNode(
        nodes,
        nid(ABS_SP_MP, n),
        ["midpoint"],
        posX + nodeDistanceX / 2,
        posY - nodeDistanceY / 2,
        "",
      )
      let node4 = createNode(
        nodes,
        nid(ABS_SP, n),
        ["support"],
        posX + nodeDistanceX,
        posY - nodeDistanceY,
        "",
      )
      let node5 = createNode(
        nodes,
        nid(ABS_TOP, n),
        ["top"],
        posX + nodeDistanceX,
        posY - 2 * nodeDistanceY,
        "",
      )

      let edge1 = createEdge(
        edges,
        eid(ptype, ABS_MP, n),
        ["absedge"],
        parent["data"]["id"],
        node1["data"]["id"],
        "",
      )
      let edge2 = createEdge(
        edges,
        eid(ABS_MP, ABS, n),
        ["absedge"],
        node1["data"]["id"],
        node2["data"]["id"],
        "",
      )
      let edge3 = createEdge(
        edges,
        eid(ABS, ABS_SP_MP, n),
        ["varedge"],
        node2["data"]["id"],
        node3["data"]["id"],
        "",
      )
      let edge4 = createEdge(
        edges,
        eid(ABS_SP_MP, ABS_SP, n),
        ["varedge"],
        node3["data"]["id"],
        node4["data"]["id"],
        "",
      )
      let edge5 = createEdge(
        edges,
        eid(ABS_SP, ABS_TOP, n),
        ["varedge"],
        node4["data"]["id"],
        node5["data"]["id"],
        "",
      )

      let nodes = list{node1, node2, node3, node4, node5, ...nodes}
      let edges = list{edge1, edge2, edge3, edge4, edge5, ...edges}
      let (nodes, edges, n) = generateGraphElements'(
        t,
        list{x, ...ctx},
        list{(n, false), ...dict},
        nodes,
        edges,
        node2,
        ABS,
        L,
        redexes,
        redexEdge,
        n + 1,
      )

      (nodes, edges, n)
    }
  | App(t1, t2, a) => {
      let baseId = prettyPrint(t1, ctx) ++ " @ " ++ prettyPrint(t2, ctx)

      let node1 = createNode(nodes, "app_mid_" ++ baseId, ["midpoint"], mpPosX, mpPosY, "")
      let node2 = createNode(nodes, "app_" ++ baseId, ["application"], posX, posY, "@")

      let edge1 = createEdge(
        edges,
        parent["data"]["id"] ++ "->app_mid_" ++ baseId,
        ["appedge"],
        parent["data"]["id"],
        node1["data"]["id"],
        "",
      )
      let edge2 = createEdge(
        edges,
        "app_mid_" ++ baseId ++ "->app_" ++ baseId,
        ["appedge"],
        node1["data"]["id"],
        node2["data"]["id"],
        "",
      )

      let (nodes, edges, n) = generateGraphElements'(
        t1,
        ctx,
        dict,
        list{node1, node2, ...nodes},
        edges,
        node2,
        APP,
        L,
        redexes,
        redexEdge,
        n,
      )
      let (nodes, edges, n) = generateGraphElements'(
        t2,
        ctx,
        dict,
        nodes,
        edges,
        node2,
        APP,
        R,
        redexes,
        redexEdge,
        n,
      )
      (nodes, edges, n)
    }
  }
}

let generateGraphElementsArray = (term, ctx) => {
  let (nodes, edges) = generateGraphElements(term, ctx)
  (Array.of_list(nodes), Array.of_list(edges))
}
