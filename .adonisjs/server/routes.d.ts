import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'evaluations.store': { paramsTuple?: []; params?: {} }
    'evaluations.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'evaluations.print': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'evaluations.csv': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'evaluations.recompute': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'evaluations.destroy': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.evaluations.compute': { paramsTuple?: []; params?: {} }
    'history.index': { paramsTuple?: []; params?: {} }
    'history.csv': { paramsTuple?: []; params?: {} }
    'history.compare': { paramsTuple?: []; params?: {} }
    'ingredients.index': { paramsTuple?: []; params?: {} }
    'ingredients.store': { paramsTuple?: []; params?: {} }
    'ingredients.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'weekly.index': { paramsTuple?: []; params?: {} }
    'weekly.store': { paramsTuple?: []; params?: {} }
    'weekly.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'weekly.setDay': { paramsTuple: [ParamValue,ParamValue]; params: {'uuid': ParamValue,'day': ParamValue} }
    'weekly.destroy': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'parameters.index': { paramsTuple?: []; params?: {} }
    'parameters.store': { paramsTuple?: []; params?: {} }
    'parameters.reset': { paramsTuple?: []; params?: {} }
    'parameters.import': { paramsTuple?: []; params?: {} }
    'parameters.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parameters.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parameters.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parameters.activate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parameters.export': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'expert.index': { paramsTuple?: []; params?: {} }
    'expert.store': { paramsTuple?: []; params?: {} }
    'expert.import': { paramsTuple?: []; params?: {} }
    'expert.template': { paramsTuple?: []; params?: {} }
    'expert.export': { paramsTuple?: []; params?: {} }
    'expert.clear': { paramsTuple?: []; params?: {} }
    'expert.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'about': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'evaluations.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'evaluations.print': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'evaluations.csv': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'history.index': { paramsTuple?: []; params?: {} }
    'history.csv': { paramsTuple?: []; params?: {} }
    'history.compare': { paramsTuple?: []; params?: {} }
    'ingredients.index': { paramsTuple?: []; params?: {} }
    'weekly.index': { paramsTuple?: []; params?: {} }
    'weekly.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'parameters.index': { paramsTuple?: []; params?: {} }
    'parameters.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parameters.export': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'expert.index': { paramsTuple?: []; params?: {} }
    'expert.template': { paramsTuple?: []; params?: {} }
    'expert.export': { paramsTuple?: []; params?: {} }
    'about': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'evaluations.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'evaluations.print': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'evaluations.csv': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'history.index': { paramsTuple?: []; params?: {} }
    'history.csv': { paramsTuple?: []; params?: {} }
    'history.compare': { paramsTuple?: []; params?: {} }
    'ingredients.index': { paramsTuple?: []; params?: {} }
    'weekly.index': { paramsTuple?: []; params?: {} }
    'weekly.show': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'parameters.index': { paramsTuple?: []; params?: {} }
    'parameters.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'parameters.export': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'expert.index': { paramsTuple?: []; params?: {} }
    'expert.template': { paramsTuple?: []; params?: {} }
    'expert.export': { paramsTuple?: []; params?: {} }
    'about': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'evaluations.store': { paramsTuple?: []; params?: {} }
    'evaluations.recompute': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'api.evaluations.compute': { paramsTuple?: []; params?: {} }
    'ingredients.store': { paramsTuple?: []; params?: {} }
    'weekly.store': { paramsTuple?: []; params?: {} }
    'parameters.store': { paramsTuple?: []; params?: {} }
    'parameters.reset': { paramsTuple?: []; params?: {} }
    'parameters.import': { paramsTuple?: []; params?: {} }
    'parameters.activate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'expert.store': { paramsTuple?: []; params?: {} }
    'expert.import': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'evaluations.destroy': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'ingredients.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'weekly.destroy': { paramsTuple: [ParamValue]; params: {'uuid': ParamValue} }
    'parameters.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'expert.clear': { paramsTuple?: []; params?: {} }
    'expert.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'weekly.setDay': { paramsTuple: [ParamValue,ParamValue]; params: {'uuid': ParamValue,'day': ParamValue} }
    'parameters.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}