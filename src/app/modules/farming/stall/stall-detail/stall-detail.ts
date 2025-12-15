import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, filter, map, switchMap, tap } from 'rxjs';
import { Box, Pig, Stall } from '../../../../core/models/stall.model';
import { StallService } from '../../../../core/services/stall.service';
import { ConfirmationDialogComponent } from '../../../../core/components/confirmation-dialog/confirmation-dialog';

@Component({
    selector: 'app-stall-detail',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatDialogModule, MatMenuModule, MatSnackBarModule],
    templateUrl: './stall-detail.html',
    styleUrls: ['./stall-detail.scss']
})
export class StallDetailComponent implements OnInit {
    stall$: Observable<Stall>;
    stallId: string | null = null;
    moveSourceBoxId: string | null = null;
    recommendations: string[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private stallService: StallService,
        private snackBar: MatSnackBar,
        private dialog: MatDialog
    ) {
        this.stall$ = this.route.paramMap.pipe(
            switchMap(params => {
                this.stallId = params.get('id');
                return this.stallService.getStalls();
            }),
            map(stalls => stalls.find(s => s._id === this.stallId)),
            filter((s): s is Stall => !!s),
            tap(stall => {
                this.recommendations = this.stallService.getSlaughterRecommendations(stall).map(b => b.id);
            })
        );
    }

    ngOnInit(): void {
    }

    goBack(): void {
        this.router.navigate(['/farming/stall']);
    }

    addPig(box: Box): void {
        const birthDate = new Date();
        birthDate.setMonth(birthDate.getMonth() - 3);

        const pig: Pig = {
            id: Math.random().toString(36).substr(2, 9),
            birthDate: birthDate.toISOString(),
            entryDate: new Date().toISOString(),
            boxId: box.id
        };

        this.stallService.addPig(this.stallId!, box.id, pig)
            .then(() => this.snackBar.open('Schwein hinzugefügt', 'OK', { duration: 2000 }))
            .catch(err => this.snackBar.open(err, 'OK', { duration: 2000 }));
    }

    removePig(box: Box): void {
        if (box.pigs.length > 0) {
            const pig = box.pigs[box.pigs.length - 1];
            
            const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
                data: {
                    title: 'Schwein entfernen',
                    message: `Möchten Sie wirklich ein Schwein aus Box ${box.id} entfernen?`
                }
            });

            dialogRef.afterClosed().subscribe(result => {
                if (result) {
                    this.stallService.removePig(this.stallId!, box.id, pig.id)
                        .then(() => this.snackBar.open('Schwein entfernt', 'OK', { duration: 2000 }))
                        .catch(err => this.snackBar.open(err, 'OK', { duration: 2000 }));
                }
            });
        }
    }

    startMove(box: Box): void {
        this.moveSourceBoxId = box.id;
        this.snackBar.open('Wähle eine leere Zielbox', 'Abbrechen', { duration: 5000 }).onAction().subscribe(() => {
            this.moveSourceBoxId = null;
        });
    }

    selectTarget(targetBox: Box): void {
        if (!this.moveSourceBoxId) return;
        if (this.moveSourceBoxId === targetBox.id) {
            this.moveSourceBoxId = null;
            return;
        }

        // Move all pigs
        this.stallService.getStall(this.stallId!).subscribe(stall => {
            const sourceBox = stall.boxes.find(b => b.id === this.moveSourceBoxId);
            if (sourceBox && sourceBox.pigs.length > 0) {
                const promises = sourceBox.pigs.map(pig =>
                    this.stallService.movePig(this.stallId!, this.moveSourceBoxId!, targetBox.id, pig.id)
                );

                Promise.all(promises).then(() => {
                    this.moveSourceBoxId = null;
                    this.snackBar.open('Box umgestallt', 'OK', { duration: 2000 });
                }).catch(err => {
                    this.snackBar.open(err, 'OK', { duration: 2000 });
                    this.moveSourceBoxId = null;
                });
            }
        });
    }

    slaughterBox(box: Box): void {
        if (confirm(`Sollen alle Schweine aus ${box.name} geschlachtet werden?`)) {
            const promises = box.pigs.map(pig =>
                this.stallService.slaughterPig(this.stallId!, box.id, pig.id)
            );
            Promise.all(promises).then(() => {
                this.snackBar.open('Box geschlachtet', 'OK', { duration: 2000 });
            });
        }
    }

    getAverageAge(box: Box): number {
        if (box.pigs.length === 0) return 0;
        const totalAge = box.pigs.reduce((sum, pig) => {
            const age = new Date().getTime() - new Date(pig.birthDate).getTime();
            return sum + age;
        }, 0);
        return Math.floor((totalAge / box.pigs.length) / (1000 * 60 * 60 * 24)); // Days
    }

    isRecommended(box: Box): boolean {
        return this.recommendations.slice(0, 3).includes(box.id);
    }
}
