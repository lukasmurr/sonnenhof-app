export type Permission =
    | 'butchery.view' | 'office.view' | 'farming.view'
    | 'product.view' | 'product.create' | 'product.update' | 'product.delete'
    | 'market.view' | 'market.create' | 'market.update' | 'market.delete'
    | 'order.view' | 'order.create' | 'order.update' | 'order.delete'
    | 'employee.view' | 'employee.create' | 'employee.update' | 'employee.delete'
    | 'tuev.view' | 'tuev.create' | 'tuev.update' | 'tuev.delete'
    | 'user.manage'
    | 'vacation.view' | 'vacation.create_own' | 'vacation.update_own'
    | 'vacation.create_others' | 'vacation.update_others' | 'vacation.delete_others'
    | 'stall.view' | 'stall.create' | 'stall.update' | 'stall.delete'
    | 'crate.view' | 'crate.create' | 'crate.update' | 'crate.delete'
    | 'offer.view' | 'offer.create' | 'offer.update' | 'offer.delete'
    | 'vehicle-stock.view' | 'vehicle-stock.create' | 'vehicle-stock.manage';

export type UserGroup = 'admin' | 'office' | 'car' | 'butchery' | 'sales';
